package com.astracine.backend.presentation.exception;

import lombok.Getter;

@Getter
public class RoomBusinessException extends RuntimeException {

    private final String errorCode;

    public RoomBusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
