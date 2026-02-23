package com.astracine.backend.controller;

import com.astracine.backend.dto.order.ConfirmOrderRequest;
import com.astracine.backend.service.PaymentMockService;
import com.astracine.backend.service.SeatHoldService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class OrderController {

    private final SeatHoldService seatHoldService;
    private final PaymentMockService paymentMockService;

    public OrderController(SeatHoldService seatHoldService, PaymentMockService paymentMockService) {
        this.seatHoldService = seatHoldService;
        this.paymentMockService = paymentMockService;
    }

    /**
     * MVP: confirm = đánh dấu SOLD trong showtime_seats.
     * (Invoice/Payment/Ticket sẽ làm sau)
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@Valid @RequestBody ConfirmOrderRequest req,
                                     @AuthenticationPrincipal UserDetails user,
                                     @RequestHeader(value = "X-User-Id", required = false) String guestUserId) {
        String userId = user != null ? user.getUsername() : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");

        // Gate: require payment session PAID before allowing SOLD
        paymentMockService.ensurePaid(req.getHoldId(), req.getPaymentRef(), userId);

        seatHoldService.confirmHoldToSold(req.getHoldId(), userId);
        return ResponseEntity.ok().build();
    }
}
