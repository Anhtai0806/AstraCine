package com.astracine.backend.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

    @ExceptionHandler(PaymentRequiredException.class)
    public ResponseEntity<?> handlePaymentRequired(PaymentRequiredException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "PAYMENT_REQUIRED");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(body);
    }

    @ExceptionHandler(PaymentSessionNotFoundException.class)
    public ResponseEntity<?> handlePaymentNotFound(PaymentSessionNotFoundException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "PAYMENT_SESSION_NOT_FOUND");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(PaymentUnauthorizedException.class)
    public ResponseEntity<?> handlePaymentUnauthorized(PaymentUnauthorizedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "PAYMENT_UNAUTHORIZED");
        body.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(fe -> {
            String field = fe.getField();
            String msg = fe.getDefaultMessage();

            errors.merge(field, msg, (oldVal, newVal) -> oldVal + " | " + newVal);
        });

        String message = errors.values().stream().findFirst().orElse("Dữ liệu không hợp lệ");

        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", message);
        body.put("errors", errors);

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
