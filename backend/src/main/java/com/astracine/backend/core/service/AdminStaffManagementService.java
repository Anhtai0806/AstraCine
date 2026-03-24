package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Role;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.RoleRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.admin.AdminStaffDecisionRequest;
import com.astracine.backend.presentation.dto.admin.AdminUserManagementResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminStaffManagementService {

    private static final Pattern STAFF_USERNAME_PATTERN = Pattern.compile("^staff(\\d+)$", Pattern.CASE_INSENSITIVE);
    private static final String STAFF_ROLE_NAME = "ROLE_STAFF";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<AdminUserManagementResponse> getUsers(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .filter(user -> normalizedKeyword.isBlank() || matchesKeyword(user, normalizedKeyword))
                .map(this::mapToResponse)
                .toList();
    }

    public AdminUserManagementResponse createAutoStaffAccount() {
        Role staffRole = getOrCreateRole(STAFF_ROLE_NAME);
        String username = generateNextStaffUsername();
        String temporaryPassword = generateStrongPassword();

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setEnabled(true);
        user.setStatus("ACTIVE");
        user.setStaffPosition(null);
        user.setDesiredPosition(null);
        user.setStaffApplicationStatus("AVAILABLE");
        user.setStaffTemporaryPassword(temporaryPassword);
        user.setStaffCredentialsIssuedAt(LocalDateTime.now());
        user.getRoles().add(staffRole);

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    public AdminUserManagementResponse updateStaffRole(Long userId, AdminStaffDecisionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        String action = request.getAction() == null ? "" : request.getAction().trim().toUpperCase(Locale.ROOT);
        ensureStaffUser(user);

        switch (action) {
            case "UPDATE_POSITION" -> user.setStaffPosition(normalizeStaffPosition(request.getStaffPosition(), false));
            case "REVOKE" -> resetToBlankStaffAccount(user);
            default -> throw new RuntimeException("Action không hợp lệ. Dùng UPDATE_POSITION hoặc REVOKE");
        }

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    private void ensureStaffUser(User user) {
        boolean isStaff = user.getRoles().stream().anyMatch(r -> STAFF_ROLE_NAME.equals(r.getName()));
        if (!isStaff) {
            throw new RuntimeException("Người dùng này không phải tài khoản STAFF.");
        }
    }

    private void resetToBlankStaffAccount(User user) {
        String temporaryPassword = generateStrongPassword();
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setFullName(null);
        user.setEmail(null);
        user.setPhone(null);
        user.setDesiredPosition(null);
        user.setStaffPosition(null);
        user.setStatus("ACTIVE");
        user.setEnabled(true);
        user.setLockReason(null);
        user.setStaffApplicationStatus("AVAILABLE");
        user.setStaffTemporaryPassword(temporaryPassword);
        user.setStaffCredentialsIssuedAt(LocalDateTime.now());
    }

    private boolean matchesKeyword(User user, String keyword) {
        return contains(user.getUsername(), keyword)
                || contains(user.getFullName(), keyword)
                || contains(user.getEmail(), keyword)
                || contains(user.getPhone(), keyword)
                || contains(user.getDesiredPosition(), keyword)
                || contains(user.getStaffPosition(), keyword)
                || contains(user.getStaffApplicationStatus(), keyword)
                || user.getRoles().stream().map(Role::getName).anyMatch(role -> contains(role, keyword));
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private Role getOrCreateRole(String roleName) {
        return roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));
    }

    private AdminUserManagementResponse mapToResponse(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        boolean blankStaffAccount = isBlank(user.getFullName()) && isBlank(user.getEmail()) && isBlank(user.getPhone());

        return AdminUserManagementResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus())
                .enabled(Boolean.TRUE.equals(user.getEnabled()))
                .lockReason(user.getLockReason())
                .desiredPosition(user.getDesiredPosition())
                .staffApplicationStatus(user.getStaffApplicationStatus())
                .staffPosition(user.getStaffPosition())
                .staff(roles.contains(STAFF_ROLE_NAME))
                .blankStaffAccount(blankStaffAccount)
                .staffTemporaryPassword(user.getStaffTemporaryPassword())
                .staffCredentialsIssuedAt(user.getStaffCredentialsIssuedAt())
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String generateNextStaffUsername() {
        int nextNumber = userRepository.findAll().stream()
                .map(User::getUsername)
                .map(this::extractStaffNumber)
                .filter(number -> number >= 0)
                .max(Comparator.naturalOrder())
                .orElse(0) + 1;

        String candidate = formatStaffUsername(nextNumber);
        while (userRepository.existsByUsername(candidate)) {
            nextNumber++;
            candidate = formatStaffUsername(nextNumber);
        }
        return candidate;
    }

    private int extractStaffNumber(String username) {
        if (username == null) {
            return -1;
        }
        Matcher matcher = STAFF_USERNAME_PATTERN.matcher(username.trim());
        if (!matcher.matches()) {
            return -1;
        }
        return Integer.parseInt(matcher.group(1));
    }

    private String formatStaffUsername(int number) {
        if (number < 100) {
            return String.format("staff%02d", number);
        }
        return "staff" + number;
    }

    private String generateStrongPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnopqrstuvwxyz";
        String digits = "23456789";
        String symbols = "!@#$%^&*";
        String all = upper + lower + digits + symbols;

        StringBuilder builder = new StringBuilder();
        builder.append(randomChar(upper));
        builder.append(randomChar(lower));
        builder.append(randomChar(digits));
        builder.append(randomChar(symbols));

        while (builder.length() < 12) {
            builder.append(randomChar(all));
        }

        List<Character> shuffled = builder.chars()
                .mapToObj(c -> (char) c)
                .collect(Collectors.toList());
        java.util.Collections.shuffle(shuffled);

        StringBuilder password = new StringBuilder();
        shuffled.forEach(password::append);
        return password.toString();
    }

    private char randomChar(String source) {
        int index = SecureRandomHolder.INSTANCE.nextInt(source.length());
        return source.charAt(index);
    }

    private String normalizeStaffPosition(String value, boolean required) {
        if (value == null || value.isBlank()) {
            if (required) {
                throw new RuntimeException("Vui lòng chọn vị trí cho nhân viên.");
            }
            return null;
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "COUNTER", "CHECKIN", "CONCESSION", "MULTI" -> normalized;
            default -> throw new RuntimeException("Vị trí nhân viên không hợp lệ.");
        };
    }

    private static final class SecureRandomHolder {
        private static final java.security.SecureRandom INSTANCE = new java.security.SecureRandom();
    }
}
