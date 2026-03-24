package com.astracine.backend.presentation.exception;

public class HoldUnauthorizedException extends RuntimeException {
    public HoldUnauthorizedException() {
        super("You do not own this hold");
    }
}
