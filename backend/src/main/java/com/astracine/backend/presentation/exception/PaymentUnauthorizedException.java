package com.astracine.backend.presentation.exception;

public class PaymentUnauthorizedException extends RuntimeException {
    public PaymentUnauthorizedException() {
        super("Payment session does not belong to current user");
    }
}
