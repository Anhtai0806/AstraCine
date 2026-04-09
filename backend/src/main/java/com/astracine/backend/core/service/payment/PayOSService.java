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

@Slf4j
@Service
public class PayOSService {

    private static final String HOLD_SUMMARY_KEY_PREFIX = "hold:summary:";
    private static final String PAYOS_ORDER_KEY_PREFIX = "payos:order:";
    private static final String PAYOS_HOLD_KEY_PREFIX = "payos:hold:";

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
            Long frontendAmount, List<String> promotionCodes, // <--- ĐÃ SỬA: Thay String thành List<String>
            List<ComboCartItemDTO> comboItems,
            Long discountAmount, Integer pointsUsed) {

        HoldMeta hold = readHoldMeta(holdId, userId);

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

        long amount = (frontendAmount != null && frontendAmount >= 0)
                ? frontendAmount
                : Math.max(hold.seatCount, 1) * FALLBACK_PRICE_PER_SEAT;

        long orderCode = generateOrderCode(holdId);
        int finalPointsUsed = pointsUsed != null ? pointsUsed : 0;

        if (amount == 0) {
            String holdRaw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
            long showtimeId = (holdRaw != null) ? parseShowtimeId(holdRaw) : 0L;
            List<Long> seatIds = (holdRaw != null) ? parseSeatIds(holdRaw) : Collections.emptyList();

            try {
                invoiceService.createInvoice(
                        holdId, userId, orderCode, BigDecimal.ZERO, promotionCodes,
                        comboItems, showtimeId, seatIds, finalPointsUsed);
            } catch (Exception ex) {
                log.error("[PayOS] Invoice creation failed for 0 VND orderCode={}: {}", orderCode, ex.getMessage(), ex);
                throw new RuntimeException("Lỗi tạo hoá đơn 0đ: " + ex.getMessage(), ex);
            }

            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("holdId", holdId);
            sessionData.put("userId", userId);
            sessionData.put("status", "PAID");
            sessionData.put("amount", amount);
            sessionData.put("promotionCodes", promotionCodes != null ? promotionCodes : Collections.emptyList()); // <--- ĐÃ SỬA
            sessionData.put("comboItems", comboItems != null ? comboItems : Collections.emptyList());
            sessionData.put("showtimeId", showtimeId);
            sessionData.put("seatIds", seatIds);
            sessionData.put("pointsUsed", finalPointsUsed);

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

        String desc = (promotionCodes != null && !promotionCodes.isEmpty())
                ? "AC-" + (orderCode % 1_000_000L) + "-" + promotionCodes.get(0)
                : "AstraCine-" + (orderCode % 1_000_000L);
        String description = desc.length() > 25 ? desc.substring(0, 25) : desc;

        long ttlMillis = Math.max(60_000, hold.expiresAt - Instant.now().toEpochMilli());
        long expiredAtEpoch = Instant.now().plusMillis(ttlMillis).getEpochSecond();

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

        long discount = (discountAmount != null && discountAmount > 0) ? discountAmount : 0L;
        long ticketAmount = Math.max(amount - totalComboAmount + discount, 0L);
        long pricePerSeat = hold.seatCount > 0 ? ticketAmount / hold.seatCount : ticketAmount;

        List<PaymentLinkItem> paymentItems = new java.util.ArrayList<>();
        paymentItems.add(PaymentLinkItem.builder()
                .name("Ve xem phim")
                .quantity(hold.seatCount > 0 ? hold.seatCount : 1)
                .price(pricePerSeat)
                .build());

        if (comboItems != null) {
            for (ComboCartItemDTO combo : comboItems) {
                if (combo.getQuantity() == null || combo.getQuantity() <= 0)
                    continue;
                long unitPrice = combo.getPrice() != null ? combo.getPrice().longValue() : 0L;
                String comboName = combo.getName() != null ? combo.getName() : "Bap nuoc";
                if (comboName.length() > 50)
                    comboName = comboName.substring(0, 50);
                paymentItems.add(PaymentLinkItem.builder()
                        .name(comboName)
                        .quantity(combo.getQuantity())
                        .price(unitPrice)
                        .build());
            }
        }

        if (discount > 0) {
            String discountLabel = "Giam gia";
            if (promotionCodes != null && !promotionCodes.isEmpty()) {
                String suffix = " (" + String.join(",", promotionCodes) + ")";
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

            String holdRaw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
            long showtimeId = (holdRaw != null) ? parseShowtimeId(holdRaw) : 0L;
            List<Long> seatIds = (holdRaw != null) ? parseSeatIds(holdRaw) : Collections.emptyList();

            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("holdId", holdId);
            sessionData.put("userId", userId);
            sessionData.put("status", "PENDING");
            sessionData.put("amount", amount);
            sessionData.put("promotionCodes", promotionCodes != null ? promotionCodes : Collections.emptyList()); // <--- ĐÃ SỬA
            sessionData.put("comboItems", comboItems != null ? comboItems : Collections.emptyList());
            sessionData.put("showtimeId", showtimeId);
            sessionData.put("seatIds", seatIds);
            sessionData.put("pointsUsed", finalPointsUsed);

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

            session.put("status", newStatus);
            Long remainTtl = redis.getExpire(orderKey);
            Duration ttl = (remainTtl != null && remainTtl > 0)
                    ? Duration.ofSeconds(remainTtl)
                    : Duration.ofMinutes(10);
            redis.opsForValue().set(orderKey, objectMapper.writeValueAsString(session), ttl);

            log.info("[PayOS] Webhook orderCode={} status {} → {}", orderCode, currentStatus, newStatus);

            if (isPaid && !"PAID".equals(currentStatus)) {
                try {
                    BigDecimal amount = new BigDecimal(String.valueOf(session.getOrDefault("amount", 0)));
                    
                    // 👇 ĐÃ SỬA: Đọc Mảng thay vì Chuỗi
                    @SuppressWarnings("unchecked")
                    List<String> promotionCodes = objectMapper.convertValue(
                            session.getOrDefault("promotionCodes", Collections.emptyList()),
                            new TypeReference<List<String>>() {});

                    @SuppressWarnings("unchecked")
                    List<ComboCartItemDTO> comboItems = objectMapper.convertValue(
                            session.getOrDefault("comboItems", Collections.emptyList()),
                            new TypeReference<List<ComboCartItemDTO>>() {
                            });

                    long showtimeId = ((Number) session.getOrDefault("showtimeId", 0L)).longValue();

                    @SuppressWarnings("unchecked")
                    List<Long> seatIds = objectMapper.convertValue(
                            session.getOrDefault("seatIds", Collections.emptyList()),
                            new TypeReference<List<Long>>() {
                            });

                    int pointsUsed = ((Number) session.getOrDefault("pointsUsed", 0)).intValue();

                    invoiceService.createInvoice(
                            holdId, userId, orderCode, amount, promotionCodes, // <--- ĐÃ SỬA
                            comboItems, showtimeId, seatIds, pointsUsed);
                } catch (Exception ex) {
                    log.error("[PayOS] Invoice creation failed orderCode={}: {}", orderCode, ex.getMessage(), ex);
                }
            }

            if (!isPaid && !"CANCELLED".equals(currentStatus)) {
                try {
                    seatHoldService.releaseHold(holdId, userId);
                    log.info("[PayOS] Hold released on cancel orderCode={} holdId={}", orderCode, holdId);
                } catch (Exception ex) {
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
    // 3. Confirm payment từ returnUrl
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

            if ("PAID".equals(currentStatus)) {
                log.info("[PayOS] confirmPayment: orderCode={} already PAID, skipping", orderCode);
                return true;
            }

            if (!"PAID".equals(payosStatus)) {
                log.info("[PayOS] confirmPayment: orderCode={} payosStatus={}, not PAID", orderCode, payosStatus);
                return false;
            }

            session.put("status", "PAID");
            Long remainTtl = redis.getExpire(orderKey);
            Duration ttl = (remainTtl != null && remainTtl > 0)
                    ? Duration.ofSeconds(remainTtl)
                    : Duration.ofMinutes(30);
            redis.opsForValue().set(orderKey, objectMapper.writeValueAsString(session), ttl);

            String holdId = (String) session.get("holdId");
            String userId = (String) session.get("userId");
            BigDecimal amount = new BigDecimal(String.valueOf(session.getOrDefault("amount", 0)));
            
            // 👇 ĐÃ SỬA: Đọc Mảng thay vì Chuỗi
            @SuppressWarnings("unchecked")
            List<String> promotionCodes = objectMapper.convertValue(
                    session.getOrDefault("promotionCodes", Collections.emptyList()),
                    new TypeReference<List<String>>() {});

            @SuppressWarnings("unchecked")
            List<ComboCartItemDTO> comboItems = objectMapper.convertValue(
                    session.getOrDefault("comboItems", Collections.emptyList()),
                    new TypeReference<List<ComboCartItemDTO>>() {
                    });

            long showtimeId = ((Number) session.getOrDefault("showtimeId", 0L)).longValue();

            @SuppressWarnings("unchecked")
            List<Long> seatIds = objectMapper.convertValue(
                    session.getOrDefault("seatIds", Collections.emptyList()),
                    new TypeReference<List<Long>>() {
                    });

            int pointsUsed = ((Number) session.getOrDefault("pointsUsed", 0)).intValue();

            invoiceService.createInvoice(
                    holdId, userId, orderCode, amount, promotionCodes, // <--- ĐÃ SỬA
                    comboItems, showtimeId, seatIds, pointsUsed);

            log.info("[PayOS] confirmPayment: Invoice created for orderCode={}", orderCode);
            return true;

        } catch (Exception e) {
            log.error("[PayOS] confirmPayment failed orderCode={}: {}", orderCode, e.getMessage(), e);
            return false;
        }
    }

    public void verifyPaid(String holdId, long orderCode, String userId) {
        String orderKey = PAYOS_ORDER_KEY_PREFIX + orderCode;
        String sessionRaw = redis.opsForValue().get(orderKey);

        if (sessionRaw == null) {
            throw new PaymentRequiredException("Không tìm thấy session thanh toán PayOS cho orderCode=" + orderCode);
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