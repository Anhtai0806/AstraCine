package com.astracine.backend.exception;

public class HoldUnauthorizedException extends RuntimeException {
    public HoldUnauthorizedException() {
        super("You do not own this hold");
    }
}
