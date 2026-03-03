package com.astracine.backend.core.service;

import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import com.astracine.backend.presentation.dto.payment.PayOSCreateResponse;
import com.astracine.backend.presentation.exception.HoldNotFoundException;
import com.astracine.backend.presentation.exception.PaymentRequiredException;
import com.astracine.backend.presentation.exception.PaymentUnauthorizedException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;
import vn.payos.model.webhooks.WebhookData;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Dịch vụ thanh toán PayOS (SDK v2).
 *
 * Redis keys:
 *  payos:order:{orderCode} → JSON { holdId, userId, status, amount, promotionCode, comboItems }
 *  payos:hold:{holdId}     → orderCode (String)
 */
@Slf4j
@Service
public class PayOSService {

    private static final String HOLD_SUMMARY_KEY_PREFIX = "hold:summary:";
    private static final String PAYOS_ORDER_KEY_PREFIX  = "payos:order:";
    private static final String PAYOS_HOLD_KEY_PREFIX   = "payos:hold:";

    /** Giá dự phòng (fallback) khi FE không gửi amount */
    private static final long FALLBACK_PRICE_PER_SEAT = 90_000L;

    private final PayOS payOS;
    private final StringRedisTemplate redis;
    private final InvoiceService invoiceService;
    private final ObjectMapper objectMapper;

    public PayOSService(PayOS payOS, StringRedisTemplate redis,
                        InvoiceService invoiceService, ObjectMapper objectMapper) {
        this.payOS = payOS;
        this.redis = redis;
        this.invoiceService = invoiceService;
        this.objectMapper = objectMapper;
    }

    // =========================================================
    // 1. Tạo payment link
    // =========================================================
    public PayOSCreateResponse createPaymentLink(String holdId, String userId,
            String returnUrl, String cancelUrl,
            Long frontendAmount, String promotionCode,
            List<ComboCartItemDTO> comboItems) {

        HoldMeta hold = readHoldMeta(holdId, userId);

        // Idempotent: nếu đã có orderCode → trả lại
        String existingOrderCode = redis.opsForValue().get(PAYOS_HOLD_KEY_PREFIX + holdId);
        if (existingOrderCode != null) {
            String sessionRaw = redis.opsForValue().get(PAYOS_ORDER_KEY_PREFIX + existingOrderCode);
            if (sessionRaw != null) {
                try {
                    Map<String, Object> prev = objectMapper.readValue(sessionRaw, new TypeReference<>() {});
                    String status = (String) prev.getOrDefault("status", "PENDING");
                    return PayOSCreateResponse.builder()
                            .orderCode(Long.parseLong(existingOrderCode))
                            .checkoutUrl("")
                            .qrCode("")
                            .status(status)
                            .build();
                } catch (Exception ignored) {}
            }
        }

        // Tính amount
        long amount = (frontendAmount != null && frontendAmount > 0)
                ? frontendAmount
                : Math.max(hold.seatCount, 1) * FALLBACK_PRICE_PER_SEAT;

        long orderCode = generateOrderCode(holdId);

        // Description tối đa 25 ký tự
        String desc = (promotionCode != null && !promotionCode.isBlank())
                ? "AC-" + (orderCode % 1_000_000L) + "-" + promotionCode
                : "AstraCine-" + (orderCode % 1_000_000L);
        String description = desc.length() > 25 ? desc.substring(0, 25) : desc;

        long ttlMillis = Math.max(60_000, hold.expiresAt - Instant.now().toEpochMilli());
        long expiredAtEpoch = Instant.now().plusMillis(ttlMillis).getEpochSecond();

        long pricePerSeat = hold.seatCount > 0 ? amount / hold.seatCount : amount;
        PaymentLinkItem ticket = PaymentLinkItem.builder()
                .name("Ve xem phim")
                .quantity(hold.seatCount > 0 ? hold.seatCount : 1)
                .price(pricePerSeat)
                .build();

        CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount(amount)
                .description(description)
                .items(List.of(ticket))
                .returnUrl(returnUrl)
                .cancelUrl(cancelUrl)
                .expiredAt(expiredAtEpoch)
                .build();

        try {
            CreatePaymentLinkResponse response = payOS.paymentRequests().create(request);

            // Lưu toàn bộ context vào Redis để webhook dùng tạo invoice
            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("holdId", holdId);
            sessionData.put("userId", userId);
            sessionData.put("status", "PENDING");
            sessionData.put("amount", amount);
            sessionData.put("promotionCode", promotionCode);
            sessionData.put("comboItems", comboItems != null ? comboItems : Collections.emptyList());

            Duration ttl = Duration.ofMillis(Math.max(ttlMillis, 60_000L));
            redis.opsForValue().set(PAYOS_ORDER_KEY_PREFIX + orderCode,
                    objectMapper.writeValueAsString(sessionData), ttl);
            redis.opsForValue().set(PAYOS_HOLD_KEY_PREFIX + holdId,
                    String.valueOf(orderCode), ttl);

            log.info("[PayOS] Created payment link holdId={} orderCode={}", holdId, orderCode);

            return PayOSCreateResponse.builder()
                    .orderCode(orderCode)
                    .checkoutUrl(response.getCheckoutUrl())
                    .qrCode(response.getQrCode())
                    .status("PENDING")
                    .build();

        } catch (Exception e) {
            log.error("[PayOS] Failed holdId={}: {}", holdId, e.getMessage(), e);
            throw new RuntimeException("Không thể tạo PayOS payment link: " + e.getMessage(), e);
        }
    }

    // =========================================================
    // 2. Xử lý webhook từ PayOS
    // =========================================================
    public boolean handleWebhook(Map<String, Object> rawPayload) {
        try {
            WebhookData verified = payOS.webhooks().verify(rawPayload);
            long orderCode = verified.getOrderCode();
            String orderKey = PAYOS_ORDER_KEY_PREFIX + orderCode;

            String sessionRaw = redis.opsForValue().get(orderKey);
            if (sessionRaw == null) {
                log.warn("[PayOS] Webhook for unknown orderCode={}", orderCode);
                return false;
            }

            Map<String, Object> session = objectMapper.readValue(sessionRaw, new TypeReference<>() {});
            String holdId       = (String) session.get("holdId");
            String userId       = (String) session.get("userId");
            String currentStatus = (String) session.getOrDefault("status", "PENDING");

            boolean isPaid = "00".equals(verified.getCode());
            String newStatus = isPaid ? "PAID" : "CANCELLED";

            // Cập nhật status trong Redis
            session.put("status", newStatus);
            Long remainTtl = redis.getExpire(orderKey);
            Duration ttl = (remainTtl != null && remainTtl > 0)
                    ? Duration.ofSeconds(remainTtl)
                    : Duration.ofMinutes(10);
            redis.opsForValue().set(orderKey, objectMapper.writeValueAsString(session), ttl);

            log.info("[PayOS] Webhook orderCode={} status {} → {}", orderCode, currentStatus, newStatus);

            // Tạo invoice khi thanh toán thành công lần đầu
            if (isPaid && !"PAID".equals(currentStatus)) {
                try {
                    BigDecimal amount = new BigDecimal(String.valueOf(
                            session.getOrDefault("amount", 0)));
                    String promotionCode = (String) session.get("promotionCode");

                    @SuppressWarnings("unchecked")
                    List<ComboCartItemDTO> comboItems = objectMapper.convertValue(
                            session.getOrDefault("comboItems", Collections.emptyList()),
                            new TypeReference<List<ComboCartItemDTO>>() {});

                    invoiceService.createInvoice(
                            holdId, userId, orderCode, amount, promotionCode, comboItems);
                } catch (Exception ex) {
                    log.error("[PayOS] Invoice creation failed orderCode={}: {}", orderCode, ex.getMessage(), ex);
                    // Không throw — vẫn trả 200 cho PayOS để tránh retry
                }
            }

            return true;

        } catch (Exception e) {
            log.error("[PayOS] Webhook verification failed: {}", e.getMessage(), e);
            return false;
        }
    }

    // =========================================================
    // 3. Verify payment đã PAID
    // =========================================================
    public void verifyPaid(String holdId, long orderCode, String userId) {
        String orderKey = PAYOS_ORDER_KEY_PREFIX + orderCode;
        String sessionRaw = redis.opsForValue().get(orderKey);

        if (sessionRaw == null) {
            throw new PaymentRequiredException(
                    "Không tìm thấy session thanh toán PayOS cho orderCode=" + orderCode);
        }

        try {
            Map<String, Object> session = objectMapper.readValue(sessionRaw, new TypeReference<>() {});
            String storedHoldId = (String) session.get("holdId");
            String storedUserId = (String) session.get("userId");
            String status       = (String) session.getOrDefault("status", "PENDING");

            if (!Objects.equals(storedHoldId, holdId)) {
                throw new PaymentRequiredException("PayOS orderCode không khớp với holdId");
            }
            if (!Objects.equals(storedUserId, userId)) {
                throw new PaymentUnauthorizedException();
            }
            if (!"PAID".equals(status)) {
                throw new PaymentRequiredException("Thanh toán chưa hoàn tất. Trạng thái: " + status);
            }
        } catch (PaymentRequiredException | PaymentUnauthorizedException ex) {
            throw ex;
        } catch (Exception e) {
            throw new PaymentRequiredException("Dữ liệu thanh toán không hợp lệ");
        }
    }

    // =========================================================
    // Internal helpers
    // =========================================================
    private HoldMeta readHoldMeta(String holdId, String userId) {
        String raw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
        if (raw == null) throw new HoldNotFoundException(holdId);

        String[] parts = raw.split("\\|", 4);
        if (parts.length < 4) throw new HoldNotFoundException(holdId);

        String holdOwner = parts[1];
        if (!Objects.equals(holdOwner, userId)) throw new PaymentUnauthorizedException();

        long expiresAt = Long.parseLong(parts[2]);
        int seatCount = parts[3].isBlank() ? 0 : parts[3].split(",").length;
        return new HoldMeta(expiresAt, seatCount);
    }

    private static long generateOrderCode(String holdId) {
        long hash = Math.abs((long) holdId.hashCode());
        return (hash % 9_000_000_000L) + 1_000_000_000L;
    }

    private record HoldMeta(long expiresAt, int seatCount) {}
}
