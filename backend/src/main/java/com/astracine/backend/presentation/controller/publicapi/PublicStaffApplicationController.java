package com.astracine.backend.presentation.controller.publicapi;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.astracine.backend.core.service.StaffApplicationService;
import com.astracine.backend.presentation.dto.staff.StaffApplicationCreateRequest;
import com.astracine.backend.presentation.dto.staff.StaffApplicationResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth/staff-applications")
@RequiredArgsConstructor
public class PublicStaffApplicationController {

    private final StaffApplicationService staffApplicationService;

    @PostMapping
    public ResponseEntity<StaffApplicationResponse> submit(
            @Valid @RequestBody StaffApplicationCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffApplicationService.submit(request));
    }
}