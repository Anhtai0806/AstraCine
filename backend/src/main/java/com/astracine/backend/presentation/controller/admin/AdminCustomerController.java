package com.astracine.backend.presentation.controller.admin;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.astracine.backend.core.service.AdminCustomerService;
import com.astracine.backend.presentation.dto.admin.AdminUserManagementResponse;
import com.astracine.backend.presentation.dto.admin.LockRequest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCustomerController {

    private final AdminCustomerService adminCustomerService;

    // Get all customers with optional search keyword
    @GetMapping
public ResponseEntity<?> getAllCustomers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "15") int size,
        @RequestParam(required = false) String keyword) {

    return ResponseEntity.ok(
            adminCustomerService.getAllCustomers(page, size, keyword));
}

    // Lock customer account
    @PutMapping("/{userId}/lock")
    public ResponseEntity<String> lockCustomer(
            @PathVariable Long userId,
            @Valid @RequestBody LockRequest request) {

        return ResponseEntity.ok(
                adminCustomerService.lockCustomer(userId, request.getReason()));
    }

    // Unlock customer account
    @PutMapping("/{userId}/unlock")
    public ResponseEntity<String> unlockCustomer(@PathVariable Long userId) {
        return ResponseEntity.ok(adminCustomerService.unlockCustomer(userId));
    }
}
