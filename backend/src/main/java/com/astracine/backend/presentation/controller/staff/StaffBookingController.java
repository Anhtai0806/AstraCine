package com.astracine.backend.presentation.controller.staff;

import com.astracine.backend.core.service.StaffBookingService;
import com.astracine.backend.presentation.dto.staff.StaffCounterBookingRequest;
import com.astracine.backend.presentation.dto.staff.StaffCounterBookingResponse;
import com.astracine.backend.presentation.dto.staff.StaffTicketVerificationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffBookingController {

    private final StaffBookingService staffBookingService;

    @PostMapping("/counter-bookings")
    public ResponseEntity<StaffCounterBookingResponse> createCounterBooking(
            @Valid @RequestBody StaffCounterBookingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new RuntimeException("Phiên đăng nhập của nhân viên đã hết hạn.");
        }

        return ResponseEntity.ok(
                staffBookingService.createCounterBooking(request, userDetails.getUsername()));
    }

    @GetMapping("/tickets/lookup")
    public ResponseEntity<StaffTicketVerificationResponse> lookupTicket(
            @RequestParam String code,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new RuntimeException("Phiên đăng nhập của nhân viên đã hết hạn.");
        }

        return ResponseEntity.ok(
                staffBookingService.lookupTicket(code, userDetails.getUsername()));
    }

    @PostMapping("/tickets/check-in")
    public ResponseEntity<StaffTicketVerificationResponse> checkInTicket(
            @RequestParam String code,
            @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new RuntimeException("Phiên đăng nhập của nhân viên đã hết hạn.");
        }

        return ResponseEntity.ok(
                staffBookingService.checkInTicket(code, userDetails.getUsername()));
    }
}