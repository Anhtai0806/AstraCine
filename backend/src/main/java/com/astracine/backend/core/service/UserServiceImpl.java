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

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return buildUserProfileResponse(user);
    }

    @Override
    public UserProfileResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String normalizedFullName = request.getFullName().trim();
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedPhone = request.getPhone().trim();

        String currentEmail = user.getEmail();
        if ((currentEmail == null || !currentEmail.equalsIgnoreCase(normalizedEmail))
                && userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email already exists");
        }

        String currentPhone = user.getPhone();
        if ((currentPhone == null || !currentPhone.equals(normalizedPhone))
                && userRepository.existsByPhone(normalizedPhone)) {
            throw new RuntimeException("Phone already exists");
        }

        user.setFullName(normalizedFullName);
        user.setEmail(normalizedEmail);
        user.setPhone(normalizedPhone);

        syncStaffAccountStatus(user);

        userRepository.save(user);
        return buildUserProfileResponse(user);
    }

    @Override
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new RuntimeException(
                    "M\u1eadt kh\u1ea9u m\u1edbi ph\u1ea3i kh\u00e1c m\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i");
        }

        String newPassword = request.getNewPassword();

        // Kiem tra do dai mat khau (it nhat 8 ky tu)
        if (newPassword.length() < 8) {
            throw new RuntimeException("M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 8 k\u00fd t\u1ef1");
        }

        // Kiem tra co it nhat mot chu hoa
        if (!newPassword.matches(".*[A-Z].*")) {
            throw new RuntimeException(
                    "M\u1eadt kh\u1ea9u ph\u1ea3i ch\u1ee9a \u00edt nh\u1ea5t m\u1ed9t ch\u1eef c\u00e1i vi\u1ebft hoa");
        }

        // Kiem tra co it nhat mot ky tu dac biet
        if (!newPassword.matches(".*[!@#$%^&*(),.?\":{}|<>].*")) {
            throw new RuntimeException(
                    "M\u1eadt kh\u1ea9u ph\u1ea3i ch\u1ee9a \u00edt nh\u1ea5t m\u1ed9t k\u00fd t\u1ef1 \u0111\u1eb7c bi\u1ec7t");
        }

        // Kiem tra mat khau moi va xac nhan
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException(
                    "M\u1eadt kh\u1ea9u m\u1edbi v\u00e0 x\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u kh\u00f4ng kh\u1edbp");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setStaffTemporaryPassword(null);
        userRepository.save(user);
    }

    private void syncStaffAccountStatus(User user) {
        boolean isStaff = user.getRoles().stream().anyMatch(role -> "ROLE_STAFF".equals(role.getName()));
        if (!isStaff) {
            return;
        }

        boolean hasProfile = user.getFullName() != null && !user.getFullName().isBlank()
                && user.getEmail() != null && !user.getEmail().isBlank()
                && user.getPhone() != null && !user.getPhone().isBlank();

        user.setStaffApplicationStatus(hasProfile ? "ASSIGNED" : "AVAILABLE");
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