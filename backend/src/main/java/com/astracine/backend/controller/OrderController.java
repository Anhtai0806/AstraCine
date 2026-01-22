package com.astracine.backend.controller;

import com.astracine.backend.dto.order.ConfirmOrderRequest;
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

    public OrderController(SeatHoldService seatHoldService) {
        this.seatHoldService = seatHoldService;
    }

    /**
     * MVP: confirm = đánh dấu SOLD trong showtime_seats.
     * (Invoice/Payment/Ticket sẽ làm sau)
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(@Valid @RequestBody ConfirmOrderRequest req,
                                    @AuthenticationPrincipal UserDetails user) {
        String userId = user != null ? user.getUsername() : "anonymous";
        seatHoldService.confirmHoldToSold(req.getHoldId(), userId);
        return ResponseEntity.ok().build();
    }
}
