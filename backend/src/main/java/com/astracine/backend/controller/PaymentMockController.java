package com.astracine.backend.controller;

import com.astracine.backend.dto.payment.MockPaymentConfirmResponse;
import com.astracine.backend.dto.payment.MockPaymentCreateRequest;
import com.astracine.backend.dto.payment.MockPaymentCreateResponse;
import com.astracine.backend.service.PaymentMockService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments/mock")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class PaymentMockController {

    private final PaymentMockService paymentMockService;

    public PaymentMockController(PaymentMockService paymentMockService) {
        this.paymentMockService = paymentMockService;
    }

    @PostMapping("/create")
    public ResponseEntity<MockPaymentCreateResponse> create(
            @Valid @RequestBody MockPaymentCreateRequest req,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId
    ) {
        String userId = user != null ? user.getUsername() : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");
        return ResponseEntity.ok(paymentMockService.createSession(req.getHoldId(), userId));
    }

    @PostMapping("/{paymentSessionId}/confirm")
    public ResponseEntity<MockPaymentConfirmResponse> confirm(
            @PathVariable String paymentSessionId,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId
    ) {
        String userId = user != null ? user.getUsername() : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");
        return ResponseEntity.ok(paymentMockService.confirmPaid(paymentSessionId, userId));
    }
}
