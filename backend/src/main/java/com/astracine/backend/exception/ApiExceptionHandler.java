package com.astracine.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(HoldConflictException.class)
    public ResponseEntity<?> handleHoldConflict(HoldConflictException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "SEAT_ALREADY_HELD");
        body.put("showtimeId", ex.getShowtimeId());
        body.put("conflictSeatIds", ex.getConflictSeatIds());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(SeatAlreadySoldException.class)
    public ResponseEntity<?> handleSold(SeatAlreadySoldException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "SEAT_ALREADY_SOLD");
        body.put("showtimeId", ex.getShowtimeId());
        body.put("soldSeatIds", ex.getSoldSeatIds());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(HoldNotFoundException.class)
    public ResponseEntity<?> handleHoldNotFound(HoldNotFoundException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "HOLD_NOT_FOUND");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(HoldUnauthorizedException.class)
    public ResponseEntity<?> handleHoldUnauthorized(HoldUnauthorizedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "HOLD_UNAUTHORIZED");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "VALIDATION_ERROR");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "INTERNAL_ERROR");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
