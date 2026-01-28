package com.astracine.backend.dto.payment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MockPaymentConfirmResponse {
    private String paymentSessionId;
    private String status; // PAID
}
