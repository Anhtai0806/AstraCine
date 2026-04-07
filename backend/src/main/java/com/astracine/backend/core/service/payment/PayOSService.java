package com.astracine.backend.core.service.payment;

import com.astracine.backend.core.service.SeatHoldService;
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
 * payos:order:{orderCode} → JSON { holdId, userId, status, amount,
 * promotionCode, comboItems }
 * payos:hold:{holdId} → orderCode (String)
 */
@Slf4j
@Service
public class PayOSService {

    private static final String HOLD_SUMMARY_KEY_PREFIX = "hold:summary:";
    private static final String PAYOS_ORDER_KEY_PREFIX = "payos:order:";
    private static final String PAYOS_HOLD_KEY_PREFIX = "payos:hold:";

    /**
     * Parse showtimeId and seatIds from hold summary format:
     * showtimeId|userId|expiresAt|seatId1,seatId2,...
     */
    private static long parseShowtimeId(String raw) {
        String[] parts = raw.split("\\|", 4);
        return Long.parseLong(parts[0]);
    }

    private static List<Long> parseSeatIds(String raw) {
        String[] parts = raw.split("\\|", 4);
        if (parts.length < 4 || parts[3].isBlank())
            return Collections.emptyList();
        return java.util.Arrays.stream(parts[3].split(","))
                .filter(s -> !s.isBlank())
                .map(Long::parseLong)
                .collect(java.util.stream.Collectors.toList());
    }

    /** Giá dự phòng (fallback) khi FE không gửi amount */
    private static final long FALLBACK_PRICE_PER_SEAT = 90_000L;

    private final PayOS payOS;
    private final StringRedisTemplate redis;
    private final InvoiceService invoiceService;
    private final SeatHoldService seatHoldService;
    private final ObjectMapper objectMapper;

    public PayOSService(PayOS payOS, StringRedisTemplate redis,
            InvoiceService invoiceService, SeatHoldService seatHoldService,
            ObjectMapper objectMapper) {
        this.payOS = payOS;
        this.redis = redis;
        this.invoiceService = invoiceService;
        this.seatHoldService = seatHoldService;
        this.objectMapper = objectMapper;
    }

    // =========================================================
    // 1. Tạo payment link
    // =========================================================
    public PayOSCreateResponse createPaymentLink(String holdId, String userId,
            String returnUrl, String cancelUrl,
            Long frontendAmount, String promotionCode,
            List<ComboCartItemDTO> comboItems,
            Long discountAmount) {

        HoldMeta hold = readHoldMeta(holdId, userId);

        // Idempotent: nếu đã có orderCode → trả lại
        String existingOrderCode = redis.opsForValue().get(PAYOS_HOLD_KEY_PREFIX + holdId);
        if (existingOrderCode != null) {
            String sessionRaw = redis.opsForValue().get(PAYOS_ORDER_KEY_PREFIX + existingOrderCode);
            if (sessionRaw != null) {
                try {
                    Map<String, Object> prev = objectMapper.readValue(sessionRaw, new TypeReference<>() {
                    });
                    String status = (String) prev.getOrDefault("status", "PENDING");
                    return PayOSCreateResponse.builder()
                            .orderCode(Long.parseLong(existingOrderCode))
                            .checkoutUrl("")
                            .qrCode("")
                            .status(status)
                            .build();
                } catch (Exception ignored) {
                }
            }
        }

        // Tính amount
        long amount = (frontendAmount != null && frontendAmount >= 0)
                ? frontendAmount
                : Math.max(hold.seatCount, 1) * FALLBACK_PRICE_PER_SEAT;

        long orderCode = generateOrderCode(holdId);

        if (amount == 0) {
            String holdRaw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
            long showtimeId = (holdRaw != null) ? parseShowtimeId(holdRaw) : 0L;
            List<Long> seatIds = (holdRaw != null) ? parseSeatIds(holdRaw) : Collections.emptyList();

            try {
                invoiceService.createInvoice(
                        holdId, userId, orderCode, BigDecimal.ZERO, promotionCode,
                        comboItems, showtimeId, seatIds);
            } catch (Exception ex) {
                log.error("[PayOS] Invoice creation failed for 0 VND orderCode={}: {}", orderCode, ex.getMessage(), ex);
                throw new RuntimeException("Lỗi tạo hoá đơn 0đ: " + ex.getMessage(), ex);
            }

            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("holdId", holdId);
            sessionData.put("userId", userId);
            sessionData.put("status", "PAID");
            sessionData.put("amount", amount);
            sessionData.put("promotionCode", promotionCode);
            sessionData.put("comboItems", comboItems != null ? comboItems : Collections.emptyList());
            sessionData.put("showtimeId", showtimeId);
            sessionData.put("seatIds", seatIds);

            try {
                long ttlMillis = Math.max(60_000, hold.expiresAt - Instant.now().toEpochMilli());
                Duration ttl = Duration.ofMillis(Math.max(ttlMillis, 60_000L));
                redis.opsForValue().set(PAYOS_ORDER_KEY_PREFIX + orderCode,
                        objectMapper.writeValueAsString(sessionData), ttl);
                redis.opsForValue().set(PAYOS_HOLD_KEY_PREFIX + holdId,
                        String.valueOf(orderCode), ttl);
            } catch (Exception ignored) {
            }

            String returnUrlWithParams = returnUrl + (returnUrl.contains("?") ? "&" : "?") + "orderCode=" + orderCode
                    + "&status=PAID";
            return PayOSCreateResponse.builder()
                    .orderCode(orderCode)
                    .checkoutUrl(returnUrlWithParams)
                    .qrCode("")
                    .status("PAID")
                    .build();
        }

        // Description tối đa 25 ký tự
        String desc = (promotionCode != null && !promotionCode.isBlank())
                ? "AC-" + (orderCode % 1_000_000L) + "-" + promotionCode
                : "AstraCine-" + (orderCode % 1_000_000L);
        String description = desc.length() > 25 ? desc.substring(0, 25) : desc;

        long ttlMillis = Math.max(60_000, hold.expiresAt - Instant.now().toEpochMilli());
        long expiredAtEpoch = Instant.now().plusMillis(ttlMillis).getEpochSecond();

        // Tính tổng tiền combo để suy ra tiền vé
        long totalComboAmount = 0L;
        if (comboItems != null) {
            for (ComboCartItemDTO combo : comboItems) {
                if (combo.getSubtotal() != null) {
                    totalComboAmount += combo.getSubtotal().longValue();
                } else if (combo.getPrice() != null && combo.getQuantity() != null) {
                    totalComboAmount += combo.getPrice().longValue() * combo.getQuantity();
                }
            }
        }
        // Số tiền giảm giá (nếu FE truyền lên)
        long discount = (discountAmount != null && discountAmount > 0) ? discountAmount : 0L;
        // Tiền vé = tổng - combo (trước giảm giá), vì amount đã trừ giảm giá rồi
        // Để tổng items = amount: ticketAmount = amount - combo + discount
        long ticketAmount = Math.max(amount - totalComboAmount + discount, 0L);
        long pricePerSeat = hold.seatCount > 0 ? ticketAmount / hold.seatCount : ticketAmount;

        List<PaymentLinkItem> paymentItems = new java.util.ArrayList<>();
        paymentItems.add(PaymentLinkItem.builder()
                .name("Ve xem phim")
                .quantity(hold.seatCount > 0 ? hold.seatCount : 1)
                .price(pricePerSeat)
                .build());

        // Thêm từng combo vào danh sách items
        if (comboItems != null) {
            for (ComboCartItemDTO combo : comboItems) {
                if (combo.getQuantity() == null || combo.getQuantity() <= 0)
                    continue;
                long unitPrice = combo.getPrice() != null ? combo.getPrice().longValue() : 0L;
                String comboName = combo.getName() != null ? combo.getName() : "Bap nuoc";
                // PayOS giới hạn tên tối đa 50 ký tự
                if (comboName.length() > 50)
                    comboName = comboName.substring(0, 50);
                paymentItems.add(PaymentLinkItem.builder()
                        .name(comboName)
                        .quantity(combo.getQuantity())
                        .price(unitPrice)
                        .build());
            }
        }

        // Thêm item giảm giá (giá âm) nếu có
        if (discount > 0) {
            String discountLabel = "Giam gia";
            if (promotionCode != null && !promotionCode.isBlank()) {
                String suffix = " (" + promotionCode + ")";
                discountLabel = ("Giam gia" + suffix).length() <= 50
                        ? "Giam gia" + suffix
                        : "Giam gia";
            }
            paymentItems.add(PaymentLinkItem.builder()
                    .name(discountLabel)
                    .quantity(1)
                    .price(-discount)
                    .build());
        }

        CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .amount(amount)
                .description(description)
                .items(paymentItems)
                .returnUrl(returnUrl)
                .cancelUrl(cancelUrl)
                .expiredAt(expiredAtEpoch)
                .build();

        try {
            CreatePaymentLinkResponse response = payOS.paymentRequests().create(request);

            // Đọc lại raw hold summary để cache showtimeId + seatIds vào session
            // (tránh phụ thuộc hold:summary key có thể expire trước khi webhook đến)
            String holdRaw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
            long showtimeId = (holdRaw != null) ? parseShowtimeId(holdRaw) : 0L;
            List<Long> seatIds = (holdRaw != null) ? parseSeatIds(holdRaw) : Collections.emptyList();

            // Lưu toàn bộ context vào Redis để webhook dùng tạo invoice
            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("holdId", holdId);
            sessionData.put("userId", userId);
            sessionData.put("status", "PENDING");
            sessionData.put("amount", amount);
            sessionData.put("promotionCode", promotionCode);
            sessionData.put("comboItems", comboItems != null ? comboItems : Collections.emptyList());
            sessionData.put("showtimeId", showtimeId);
            sessionData.put("seatIds", seatIds);

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

            Map<String, Object> session = objectMapper.readValue(sessionRaw, new TypeReference<>() {
            });
            String holdId = (String) session.get("holdId");
            String userId = (String) session.get("userId");
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
                            new TypeReference<List<ComboCartItemDTO>>() {
                            });

                    // Lấy showtimeId và seatIds đã baked vào session lúc tạo link
                    long showtimeId = ((Number) session.getOrDefault("showtimeId", 0L)).longValue();

                    @SuppressWarnings("unchecked")
                    List<Long> seatIds = objectMapper.convertValue(
                            session.getOrDefault("seatIds", Collections.emptyList()),
                            new TypeReference<List<Long>>() {
                            });

                    invoiceService.createInvoice(
                            holdId, userId, orderCode, amount, promotionCode,
                            comboItems, showtimeId, seatIds);
                } catch (Exception ex) {
                    log.error("[PayOS] Invoice creation failed orderCode={}: {}", orderCode, ex.getMessage(), ex);
                    // Không throw — vẫn trả 200 cho PayOS để tránh retry
                }
            }

            // Giải phóng hold khi thanh toán bị huỷ (lớp bảo vệ phía server)
            if (!isPaid && !"CANCELLED".equals(currentStatus)) {
                try {
                    seatHoldService.releaseHold(holdId, userId);
                    log.info("[PayOS] Hold released on cancel orderCode={} holdId={}", orderCode, holdId);
                } catch (Exception ex) {
                    // Hold có thể đã expire — bỏ qua
                    log.warn("[PayOS] Release hold failed (may have expired) orderCode={}: {}", orderCode,
                            ex.getMessage());
                }
            }

            return true;

        } catch (Exception e) {
            log.error("[PayOS] Webhook verification failed: {}", e.getMessage(), e);
            return false;
        }
    }

    // =========================================================
    // 3. Confirm payment từ returnUrl (fallback khi webhook không tới)
    // Frontend gọi sau khi PayOS redirect về success page.
    // =========================================================
    public boolean confirmPayment(long orderCode, String payosStatus) {
        String orderKey = PAYOS_ORDER_KEY_PREFIX + orderCode;
        String sessionRaw = redis.opsForValue().get(orderKey);

        if (sessionRaw == null) {
            log.warn("[PayOS] confirmPayment: session not found orderCode={}", orderCode);
            return false;
        }

        try {
            Map<String, Object> session = objectMapper.readValue(sessionRaw, new TypeReference<>() {
            });
            String currentStatus = (String) session.getOrDefault("status", "PENDING");

            // Invoice đã được tạo rồi (bởi webhook) — bỏ qua (idempotent)
            if ("PAID".equals(currentStatus)) {
                log.info("[PayOS] confirmPayment: orderCode={} already PAID, skipping", orderCode);
                return true;
            }

            // PayOS gửi status=PAID trong query string của returnUrl khi thanh toán thành
            // công
            if (!"PAID".equals(payosStatus)) {
                log.info("[PayOS] confirmPayment: orderCode={} payosStatus={}, not PAID", orderCode, payosStatus);
                return false;
            }

            // Cập nhật Redis session
            session.put("status", "PAID");
            Long remainTtl = redis.getExpire(orderKey);
            Duration ttl = (remainTtl != null && remainTtl > 0)
                    ? Duration.ofSeconds(remainTtl)
                    : Duration.ofMinutes(30);
            redis.opsForValue().set(orderKey, objectMapper.writeValueAsString(session), ttl);

            // Tạo invoice
            String holdId = (String) session.get("holdId");
            String userId = (String) session.get("userId");
            BigDecimal amount = new BigDecimal(String.valueOf(session.getOrDefault("amount", 0)));
            String promotionCode = (String) session.get("promotionCode");

            @SuppressWarnings("unchecked")
            List<ComboCartItemDTO> comboItems = objectMapper.convertValue(
                    session.getOrDefault("comboItems", Collections.emptyList()),
                    new TypeReference<List<ComboCartItemDTO>>() {
                    });

            long showtimeId = ((Number) session.getOrDefault("showtimeId", 0L)).longValue();

            List<Long> seatIds = objectMapper.convertValue(
                    session.getOrDefault("seatIds", Collections.emptyList()),
                    new TypeReference<List<Long>>() {
                    });

            invoiceService.createInvoice(
                    holdId, userId, orderCode, amount, promotionCode,
                    comboItems, showtimeId, seatIds);

            log.info("[PayOS] confirmPayment: Invoice created for orderCode={}", orderCode);
            return true;

        } catch (Exception e) {
            log.error("[PayOS] confirmPayment failed orderCode={}: {}", orderCode, e.getMessage(), e);
            return false;
        }
    }

    // =========================================================
    // 4. Verify payment đã PAID
    // =========================================================
    public void verifyPaid(String holdId, long orderCode, String userId) {
        String orderKey = PAYOS_ORDER_KEY_PREFIX + orderCode;
        String sessionRaw = redis.opsForValue().get(orderKey);

        if (sessionRaw == null) {
            throw new PaymentRequiredException(
                    "Không tìm thấy session thanh toán PayOS cho orderCode=" + orderCode);
        }

        try {
            Map<String, Object> session = objectMapper.readValue(sessionRaw, new TypeReference<>() {
            });
            String storedHoldId = (String) session.get("holdId");
            String storedUserId = (String) session.get("userId");
            String status = (String) session.getOrDefault("status", "PENDING");

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
        if (raw == null)
            throw new HoldNotFoundException(holdId);

        String[] parts = raw.split("\\|", 4);
        if (parts.length < 4)
            throw new HoldNotFoundException(holdId);

        String holdOwner = parts[1];
        if (!Objects.equals(holdOwner, userId))
            throw new PaymentUnauthorizedException();

        long expiresAt = Long.parseLong(parts[2]);
        int seatCount = parts[3].isBlank() ? 0 : parts[3].split(",").length;
        return new HoldMeta(expiresAt, seatCount);
    }

    private static long generateOrderCode(String holdId) {
        long hash = Math.abs((long) holdId.hashCode());
        return (hash % 9_000_000_000L) + 1_000_000_000L;
    }

    private record HoldMeta(long expiresAt, int seatCount) {
    }
}
