
package com.astracine.backend.presentation.controller.staff;

import com.astracine.backend.core.service.StaffTicketService;
import com.astracine.backend.presentation.dto.staff.StaffCheckInRequest;
import com.astracine.backend.presentation.dto.staff.StaffTicketVerificationRequest;
import com.astracine.backend.presentation.dto.staff.StaffTicketVerificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

import java.util.Map;

@RestController
@RequestMapping("/api/staff/tickets")
@RequiredArgsConstructor
public class StaffTicketController {

    private final StaffTicketService staffTicketService;

    @PostMapping("/scan")
    public ResponseEntity<List<StaffTicketVerificationResponse>> scanTicket(
            @RequestBody StaffTicketVerificationRequest request) {

        // Kiểm tra dữ liệu rỗng đầu vào
        if (request.getQrCode() == null || request.getQrCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<StaffTicketVerificationResponse> responses = staffTicketService.verifyTicket(request);
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/checkin")
    public ResponseEntity<Map<String, String>> checkInTickets(@RequestBody StaffCheckInRequest request) {
        String resultMessage = staffTicketService.confirmCheckIn(request);
        return ResponseEntity.ok(Map.of("message", resultMessage));
    }

    @PostMapping("/combo-pickup")
    public ResponseEntity<Map<String, String>> confirmComboPickup(@RequestBody List<Long> invoiceComboIds) {
        String resultMessage = staffTicketService.confirmComboPickup(invoiceComboIds);
        return ResponseEntity.ok(Map.of("message", resultMessage));
    }
}
