package com.astracine.backend.controller;

import com.astracine.backend.dto.profile.ChangePasswordRequest;
import com.astracine.backend.dto.profile.UpdateProfileRequest;
import com.astracine.backend.dto.profile.UserProfileResponse;
import com.astracine.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Lấy thông tin profile của user
     * GET /api/user/profile?userId=1
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(
            @RequestParam(required = false) Long userId) {
        // Nếu không có userId, sử dụng mặc định là 1 (test)
        if (userId == null) {
            userId = 1L;
        }
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    /**
     * Cập nhật thông tin profile
     * PUT /api/user/profile?userId=1
     */
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestParam(required = false) Long userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        if (userId == null) {
            userId = 1L;
        }
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    /**
     * Thay đổi mật khẩu
     * PUT /api/user/change-password?userId=1
     */
    @PutMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @RequestParam(required = false) Long userId,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (userId == null) {
            userId = 1L;
        }
        userService.changePassword(userId, request);
        return ResponseEntity.ok("Password changed successfully");
    }
}
