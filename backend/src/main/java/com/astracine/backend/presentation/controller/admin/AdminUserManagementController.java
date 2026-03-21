package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.AdminStaffManagementService;
import com.astracine.backend.presentation.dto.admin.AdminStaffDecisionRequest;
import com.astracine.backend.presentation.dto.admin.AdminUserManagementResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserManagementController {

    private final AdminStaffManagementService adminStaffManagementService;

    @GetMapping
    public ResponseEntity<List<AdminUserManagementResponse>> getUsers(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(adminStaffManagementService.getUsers(keyword));
    }

    @PostMapping("/staff-accounts")
    public ResponseEntity<AdminUserManagementResponse> createAutoStaffAccount() {
        return ResponseEntity.ok(adminStaffManagementService.createAutoStaffAccount());
    }

    @PutMapping("/{userId}/staff-role")
    public ResponseEntity<AdminUserManagementResponse> updateStaffRole(
            @PathVariable Long userId,
            @Valid @RequestBody AdminStaffDecisionRequest request) {
        return ResponseEntity.ok(adminStaffManagementService.updateStaffRole(userId, request));
    }
}
