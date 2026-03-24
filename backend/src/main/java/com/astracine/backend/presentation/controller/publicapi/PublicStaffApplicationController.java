package com.astracine.backend.presentation.controller.publicapi;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.astracine.backend.presentation.dto.staff.StaffApplicationCreateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth/staff-applications")
public class PublicStaffApplicationController {

    @PostMapping
    public ResponseEntity<Void> submit(@Valid @RequestBody StaffApplicationCreateRequest request) {
        throw new RuntimeException("Chức năng staff tự đăng ký đã bị tắt. Admin sẽ cấp sẵn tài khoản staff.");
    }
}
