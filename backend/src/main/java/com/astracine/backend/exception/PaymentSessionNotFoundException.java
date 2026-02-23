package com.astracine.backend.exception;

public class PaymentSessionNotFoundException extends RuntimeException {
    public PaymentSessionNotFoundException(String paymentSessionId) {
        super("Payment session not found or expired: " + paymentSessionId);
    }
}
