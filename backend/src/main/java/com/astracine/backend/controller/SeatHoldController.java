package com.astracine.backend.controller;

import com.astracine.backend.dto.hold.HoldRequest;
import com.astracine.backend.dto.hold.HoldResponse;
import com.astracine.backend.service.SeatHoldService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class SeatHoldController {

    private final SeatHoldService seatHoldService;

    public SeatHoldController(SeatHoldService seatHoldService) {
        this.seatHoldService = seatHoldService;
    }

    @PostMapping("/api/showtimes/{showtimeId}/holds")
    public ResponseEntity<HoldResponse> holdSeats(
            @PathVariable Long showtimeId,
            @Valid @RequestBody HoldRequest req,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId
    ) {
        String userId = user != null ? user.getUsername() : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");
        HoldResponse resp = seatHoldService.holdSeats(showtimeId, req.getSeatIds(), userId);
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/api/holds/{holdId}")
    public ResponseEntity<?> releaseHold(
            @PathVariable String holdId,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId
    ) {
        String userId = user != null ? user.getUsername() : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");
        seatHoldService.releaseHold(holdId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/holds/{holdId}/renew")
    public ResponseEntity<HoldResponse> renewHold(
            @PathVariable String holdId,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId
    ) {
        String userId = user != null ? user.getUsername() : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");
        return ResponseEntity.ok(seatHoldService.renewHold(holdId, userId));
    }
}
