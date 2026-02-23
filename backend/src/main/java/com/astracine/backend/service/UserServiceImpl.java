package com.astracine.backend.service;

import com.astracine.backend.dto.profile.ChangePasswordRequest;
import com.astracine.backend.dto.profile.UpdateProfileRequest;
import com.astracine.backend.dto.profile.UserProfileResponse;
import com.astracine.backend.entity.User;
import com.astracine.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return buildUserProfileResponse(user);
    }

    @Override
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Normalize request data (trim whitespace, lowercase email)
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedPhone = request.getPhone().trim();

        // Kiểm tra email đã tồn tại (ngoại trừ user hiện tại)
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail) &&
                userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email already exists");
        }

        // Kiểm tra phone đã tồn tại (ngoại trừ user hiện tại)
        if (!user.getPhone().equals(normalizedPhone) &&
                userRepository.existsByPhone(normalizedPhone)) {
            throw new RuntimeException("Phone already exists");
        }

        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhone(normalizedPhone);

        userRepository.save(user);
        return buildUserProfileResponse(user);
    }

    @Override
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Kiểm tra mật khẩu hiện tại
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mật Khẩu hiện tại không chính xác");
        }

        // Kiểm tra mật khẩu mới và xác nhận
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        // Kiểm tra mật khẩu mới không trùng với mật khẩu cũ
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        String newPassword = request.getNewPassword();

        // Kiểm tra độ dài mật khẩu (ít nhất 8 ký tự)
        if (newPassword.length() < 8) {
            throw new RuntimeException("Mật khẩu phải có ít nhất 8 ký tự");
        }

        // Kiểm tra có ít nhất một chữ hoa
        if (!newPassword.matches(".*[A-Z].*")) {
            throw new RuntimeException("Mật khẩu phải chứa ít nhất một chữ cái viết hoa");
        }

        // Kiểm tra có ít nhất một ký tự đặc biệt
        if (!newPassword.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new RuntimeException("Mật khẩu phải chứa ít nhất một ký tự đặc biệt");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private UserProfileResponse buildUserProfileResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getStatus(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(Collectors.toSet()));
    }
}
