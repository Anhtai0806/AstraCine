package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Role;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.RoleRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.admin.AdminStaffDecisionRequest;
import com.astracine.backend.presentation.dto.admin.AdminUserManagementResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminStaffManagementService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<AdminUserManagementResponse> getUsers(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .filter(user -> normalizedKeyword.isBlank() || matchesKeyword(user, normalizedKeyword))
                .map(this::mapToResponse)
                .toList();
    }

    public AdminUserManagementResponse updateStaffRole(Long userId, AdminStaffDecisionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        String action = request.getAction() == null ? "" : request.getAction().trim().toUpperCase();
        String staffPosition = normalizeStaffPosition(request.getStaffPosition(), !"REVOKE".equals(action));

        Role staffRole = roleRepository.findByName("ROLE_STAFF")
                .orElseThrow(() -> new RuntimeException("Không tìm thấy role ROLE_STAFF"));

        switch (action) {
            case "APPROVE" -> {
                if (user.getRoles().stream().noneMatch(r -> "ROLE_STAFF".equals(r.getName()))) {
                    user.getRoles().add(staffRole);
                }
                user.setStaffPosition(staffPosition);
                user.setStaffApplicationStatus("APPROVED");
            }
            case "REVOKE" -> {
                user.getRoles().removeIf(r -> "ROLE_STAFF".equals(r.getName()));
                user.setStaffPosition(null);
                user.setStaffApplicationStatus("REVOKED");
            }
            case "UPDATE_POSITION" -> {
                if (user.getRoles().stream().noneMatch(r -> "ROLE_STAFF".equals(r.getName()))) {
                    throw new RuntimeException("Người dùng này chưa có quyền STAFF.");
                }
                user.setStaffPosition(staffPosition);
            }
            default -> throw new RuntimeException("Action không hợp lệ. Dùng APPROVE, REVOKE hoặc UPDATE_POSITION");
        }

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    private boolean matchesKeyword(User user, String keyword) {
        return contains(user.getUsername(), keyword)
                || contains(user.getFullName(), keyword)
                || contains(user.getEmail(), keyword)
                || contains(user.getPhone(), keyword)
                || contains(user.getDesiredPosition(), keyword)
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
                .staff(roles.contains("ROLE_STAFF"))
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private String normalizeStaffPosition(String value, boolean required) {
        if (value == null || value.isBlank()) {
            if (required) {
                throw new RuntimeException("Vui lòng chọn vị trí cho nhân viên.");
            }
            return null;
        }

        String normalized = value.trim().toUpperCase();
        return switch (normalized) {
            case "COUNTER", "CHECKIN", "CONCESSION", "MULTI" -> normalized;
            default -> throw new RuntimeException("Vị trí nhân viên không hợp lệ.");
        };
    }
}
