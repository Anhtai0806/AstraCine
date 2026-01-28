package com.astracine.backend.dto.payment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MockPaymentCreateResponse {
    private String paymentSessionId;
    private long amount;
    private String qrPayload;
    private long expiresAt;
    private String status; // PENDING/PAID
}
