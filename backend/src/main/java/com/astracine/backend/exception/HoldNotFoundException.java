package com.astracine.backend.exception;

public class HoldNotFoundException extends RuntimeException {
    public HoldNotFoundException(String holdId) {
        super("Hold not found or expired: " + holdId);
    }
}
