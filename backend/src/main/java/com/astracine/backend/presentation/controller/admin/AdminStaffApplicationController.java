package com.astracine.backend.presentation.controller.admin;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.astracine.backend.core.service.StaffApplicationService;
import com.astracine.backend.presentation.dto.admin.AdminStaffApplicationDecisionRequest;
import com.astracine.backend.presentation.dto.staff.StaffApplicationResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/staff-applications")
@RequiredArgsConstructor
public class AdminStaffApplicationController {

    private final StaffApplicationService staffApplicationService;

    @GetMapping
    public ResponseEntity<List<StaffApplicationResponse>> getAll(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(staffApplicationService.getAll(keyword));
    }

    @PutMapping("/{applicationId}")
    public ResponseEntity<StaffApplicationResponse> handle(
            @PathVariable Long applicationId,
            @Valid @RequestBody AdminStaffApplicationDecisionRequest request) {
        return ResponseEntity.ok(staffApplicationService.handle(applicationId, request));
    }
}