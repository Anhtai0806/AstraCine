package com.astracine.backend.presentation.controller.staff;

import com.astracine.backend.core.service.StaffComboSaleService;
import com.astracine.backend.presentation.dto.staff.StaffComboSaleRequest;
import com.astracine.backend.presentation.dto.staff.StaffComboSaleResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/combo-sales")
@RequiredArgsConstructor
public class StaffComboSaleController {

    private final StaffComboSaleService staffComboSaleService;

    @PostMapping
    public ResponseEntity<StaffComboSaleResponse> createComboOnlySale(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StaffComboSaleRequest request) {

        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        StaffComboSaleResponse response = staffComboSaleService.createComboOnlySale(
                userDetails.getUsername(),
                request
        );
        return ResponseEntity.ok(response);
    }
}