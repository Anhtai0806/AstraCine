package com.astracine.backend.service;

import com.astracine.backend.dto.payment.MockPaymentConfirmResponse;
import com.astracine.backend.dto.payment.MockPaymentCreateResponse;
import com.astracine.backend.exception.HoldNotFoundException;
import com.astracine.backend.exception.PaymentRequiredException;
import com.astracine.backend.exception.PaymentSessionNotFoundException;
import com.astracine.backend.exception.PaymentUnauthorizedException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Mock payment "rào" trước: tạo QR payload + confirm paid.
 * Storage: Redis only (no DB changes).
 */
@Service
public class PaymentMockService {

    private static final String HOLD_SUMMARY_KEY_PREFIX = "hold:summary:"; // phải khớp SeatHoldService

    private static final String PAY_SESSION_KEY_PREFIX = "pay:session:";   // pay:session:{paymentSessionId}
    private static final String PAY_HOLD_MAP_KEY_PREFIX = "pay:hold:";     // pay:hold:{holdId} -> paymentSessionId

    private final StringRedisTemplate redis;

    public PaymentMockService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public MockPaymentCreateResponse createSession(String holdId, String userId) {
        HoldMeta hold = readHoldMeta(holdId);
        if (!Objects.equals(hold.userId, userId)) {
            throw new PaymentUnauthorizedException();
        }

        // Nếu đã có session cho hold này thì trả lại session cũ (idempotent)
        String existingSessionId = redis.opsForValue().get(payHoldMapKey(holdId));
        if (existingSessionId != null) {
            PaymentSession existing = readSession(existingSessionId);
            if (existing != null && Objects.equals(existing.holdId, holdId)) {
                return MockPaymentCreateResponse.builder()
                        .paymentSessionId(existingSessionId)
                        .amount(existing.amount)
                        .qrPayload(existing.qrPayload)
                        .expiresAt(existing.expiresAt)
                        .status(existing.status)
                        .build();
            }
        }

        long amount = estimateAmount(hold.seatCount); // MVP: tính tạm
        String paymentSessionId = UUID.randomUUID().toString();
        long expiresAt = hold.expiresAt;
        String qrPayload = "astracine://pay?session=" + paymentSessionId + "&amount=" + amount;

        PaymentSession session = new PaymentSession(paymentSessionId, holdId, userId, amount, "PENDING", expiresAt, qrPayload);

        Duration ttl = Duration.ofMillis(Math.max(1000, expiresAt - Instant.now().toEpochMilli()));
        redis.opsForValue().set(paySessionKey(paymentSessionId), session.serialize(), ttl);
        redis.opsForValue().set(payHoldMapKey(holdId), paymentSessionId, ttl);

        return MockPaymentCreateResponse.builder()
                .paymentSessionId(paymentSessionId)
                .amount(amount)
                .qrPayload(qrPayload)
                .expiresAt(expiresAt)
                .status(session.status)
                .build();
    }

    public MockPaymentConfirmResponse confirmPaid(String paymentSessionId, String userId) {
        PaymentSession session = readSessionOrThrow(paymentSessionId);
        if (!Objects.equals(session.userId, userId)) {
            throw new PaymentUnauthorizedException();
        }
        session.status = "PAID";

        Duration ttl = Duration.ofMillis(Math.max(1000, session.expiresAt - Instant.now().toEpochMilli()));
        redis.opsForValue().set(paySessionKey(paymentSessionId), session.serialize(), ttl);

        return MockPaymentConfirmResponse.builder()
                .paymentSessionId(paymentSessionId)
                .status(session.status)
                .build();
    }

    /**
     * Used by /api/orders/confirm
     */
    public void ensurePaid(String holdId, String paymentSessionId, String userId) {
        if (paymentSessionId == null || paymentSessionId.isBlank()) {
            throw new PaymentRequiredException("Payment is required before confirming booking");
        }

        PaymentSession session = readSessionOrThrow(paymentSessionId);
        if (!Objects.equals(session.userId, userId)) {
            throw new PaymentUnauthorizedException();
        }
        if (!Objects.equals(session.holdId, holdId)) {
            throw new PaymentRequiredException("Payment session does not match current hold");
        }
        if (!"PAID".equals(session.status)) {
            throw new PaymentRequiredException("Payment has not been confirmed yet");
        }
    }

    // -----------------
    // Internal helpers
    // -----------------

    private HoldMeta readHoldMeta(String holdId) {
        String raw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
        if (raw == null) {
            throw new HoldNotFoundException(holdId);
        }

        // summary format: showtimeId|userId|expiresAt|seatId1,seatId2,...
        String[] parts = raw.split("\\|", 4);
        if (parts.length < 4) {
            throw new HoldNotFoundException(holdId);
        }
        String userId = parts[1];
        long expiresAt = Long.parseLong(parts[2]);
        int seatCount = parts[3].isBlank() ? 0 : parts[3].split(",").length;
        return new HoldMeta(userId, expiresAt, seatCount);
    }

    private PaymentSession readSessionOrThrow(String paymentSessionId) {
        PaymentSession s = readSession(paymentSessionId);
        if (s == null) throw new PaymentSessionNotFoundException(paymentSessionId);
        return s;
    }

    private PaymentSession readSession(String paymentSessionId) {
        String raw = redis.opsForValue().get(paySessionKey(paymentSessionId));
        if (raw == null) return null;
        return PaymentSession.deserialize(raw);
    }

    private static String paySessionKey(String paymentSessionId) {
        return PAY_SESSION_KEY_PREFIX + paymentSessionId;
    }

    private static String payHoldMapKey(String holdId) {
        return PAY_HOLD_MAP_KEY_PREFIX + holdId;
    }

    /** MVP estimation: 90k / seat */
    private static long estimateAmount(int seatCount) {
        return Math.max(0, seatCount) * 90000L;
    }

    private record HoldMeta(String userId, long expiresAt, int seatCount) {}

    private static class PaymentSession {
        final String id;
        final String holdId;
        final String userId;
        final long amount;
        String status;
        final long expiresAt;
        final String qrPayload;

        private PaymentSession(String id, String holdId, String userId, long amount, String status, long expiresAt, String qrPayload) {
            this.id = id;
            this.holdId = holdId;
            this.userId = userId;
            this.amount = amount;
            this.status = status;
            this.expiresAt = expiresAt;
            this.qrPayload = qrPayload;
        }

        // format: id|holdId|userId|amount|status|expiresAt|qrPayload
        String serialize() {
            return String.join("|",
                    safe(id), safe(holdId), safe(userId),
                    String.valueOf(amount), safe(status), String.valueOf(expiresAt), safe(qrPayload));
        }

        static PaymentSession deserialize(String raw) {
            String[] p = raw.split("\\|", 7);
            if (p.length < 7) return null;
            return new PaymentSession(
                    p[0], p[1], p[2],
                    Long.parseLong(p[3]), p[4], Long.parseLong(p[5]), p[6]
            );
        }

        private static String safe(String s) {
            return s == null ? "" : s;
        }
    }
}
