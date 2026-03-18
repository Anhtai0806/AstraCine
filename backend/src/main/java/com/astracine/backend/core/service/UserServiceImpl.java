package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.profile.ChangePasswordRequest;
import com.astracine.backend.presentation.dto.profile.UpdateProfileRequest;
import com.astracine.backend.presentation.dto.profile.UserProfileResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

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

        // Kiá»ƒm tra email Ä‘Ã£ tá»“n táº¡i (ngoáº¡i trá»« user hiá»‡n táº¡i)
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail) &&
                userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email already exists");
        }

        // Kiá»ƒm tra phone Ä‘Ã£ tá»“n táº¡i (ngoáº¡i trá»« user hiá»‡n táº¡i)
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

        // Kiem tra mat khau hien tai
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i kh\u00f4ng ch\u00ednh x\u00e1c");
        }

        if (!StringUtils.hasText(request.getNewPassword())) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u m\u1edbi l\u00e0 b\u1eaft bu\u1ed9c");
        }

        if (!StringUtils.hasText(request.getConfirmPassword())) {
            throw new RuntimeException("X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u l\u00e0 b\u1eaft bu\u1ed9c");
        }

        // Kiem tra mat khau moi khong trung voi mat khau cu
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u m\u1edbi ph\u1ea3i kh\u00e1c m\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i");
        }

        String newPassword = request.getNewPassword();

        // Kiem tra do dai mat khau (it nhat 8 ky tu)
        if (newPassword.length() < 8) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 8 k\u00fd t\u1ef1");
        }

        // Kiem tra co it nhat mot chu hoa
        if (!newPassword.matches(".*[A-Z].*")) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u ph\u1ea3i ch\u1ee9a \u00edt nh\u1ea5t m\u1ed9t ch\u1eef c\u00e1i vi\u1ebft hoa");
        }

        // Kiem tra co it nhat mot ky tu dac biet
        if (!newPassword.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u ph\u1ea3i ch\u1ee9a \u00edt nh\u1ea5t m\u1ed9t k\u00fd t\u1ef1 \u0111\u1eb7c bi\u1ec7t");
        }

        // Kiem tra mat khau moi va xac nhan
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u m\u1edbi v\u00e0 x\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u kh\u00f4ng kh\u1edbp");
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
                        .collect(Collectors.toSet()),
                user.getDesiredPosition(),
                user.getStaffApplicationStatus());
    }
}
