package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.service.PasswordResetService;
import com.astracine.backend.presentation.dto.auth.ForgotPasswordRequest;
import com.astracine.backend.presentation.dto.auth.ResetPasswordRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    // ===== POST /api/auth/forgot-password =====
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email không được để trống");
        }
        passwordResetService.initiatePasswordReset(request.getEmail().trim());
        return ResponseEntity.ok("Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.");
    }

    // ===== POST /api/auth/reset-password =====
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        if (request.getToken() == null || request.getToken().isBlank()) {
            return ResponseEntity.badRequest().body("Token không được để trống");
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            return ResponseEntity.badRequest().body("Mật khẩu phải có ít nhất 6 ký tự");
        }
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok("Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.");
    }
}
