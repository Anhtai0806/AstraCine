package com.astracine.backend.core.service;

import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.astracine.backend.core.entity.Role;
import com.astracine.backend.core.entity.StaffApplication;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.RoleRepository;
import com.astracine.backend.core.repository.StaffApplicationRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.admin.AdminStaffApplicationDecisionRequest;
import com.astracine.backend.presentation.dto.staff.StaffApplicationCreateRequest;
import com.astracine.backend.presentation.dto.staff.StaffApplicationResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffApplicationService {

    private final StaffApplicationRepository staffApplicationRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffApplicationResponse submit(StaffApplicationCreateRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();
        String phone = request.getPhone().trim();
        String fullName = request.getFullName().trim();
        String desiredPosition = request.getDesiredPosition().trim();

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Mật khẩu xác nhận không khớp");
        }

        if (desiredPosition.isBlank()) {
            throw new RuntimeException("Vui lòng nhập vị trí mong muốn");
        }

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại");
        }

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email đã tồn tại");
        }

        if (userRepository.existsByPhone(phone)) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        if (staffApplicationRepository.existsByUsernameAndStatus(username, "PENDING")) {
            throw new RuntimeException("Tên đăng nhập này đã có yêu cầu chờ admin duyệt");
        }

        if (staffApplicationRepository.existsByEmailAndStatus(email, "PENDING")) {
            throw new RuntimeException("Email này đã có yêu cầu chờ admin duyệt");
        }

        if (staffApplicationRepository.existsByPhoneAndStatus(phone, "PENDING")) {
            throw new RuntimeException("Số điện thoại này đã có yêu cầu chờ admin duyệt");
        }

        StaffApplication application = new StaffApplication();
        application.setUsername(username);
        application.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        application.setFullName(fullName);
        application.setEmail(email);
        application.setPhone(phone);
        application.setDesiredPosition(desiredPosition);
        application.setStatus("PENDING");

        return mapToResponse(staffApplicationRepository.save(application));
    }

    @Transactional(readOnly = true)
    public List<StaffApplicationResponse> getAll(String keyword) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);

        return staffApplicationRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .filter(app -> normalizedKeyword.isBlank() || matchesKeyword(app, normalizedKeyword))
                .map(this::mapToResponse)
                .toList();
    }

    public StaffApplicationResponse handle(Long applicationId, AdminStaffApplicationDecisionRequest request) {
        StaffApplication application = staffApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu"));

        String action = request.getAction() == null ? "" : request.getAction().trim().toUpperCase(Locale.ROOT);
        String adminNote = request.getAdminNote() == null ? null : request.getAdminNote().trim();
        String staffPosition = normalizeStaffPosition(request.getStaffPosition(), "APPROVE".equals(action));

        switch (action) {
            case "APPROVE" -> approveApplication(application, adminNote, staffPosition);
            case "REJECT" -> rejectApplication(application, adminNote);
            default -> throw new RuntimeException("Hành động không hợp lệ. Dùng APPROVE hoặc REJECT");
        }

        return mapToResponse(staffApplicationRepository.save(application));
    }

    private void approveApplication(StaffApplication application, String adminNote, String staffPosition) {
        if ("APPROVED".equalsIgnoreCase(application.getStatus()) && application.getCreatedUserId() != null) {
            return;
        }

        if (userRepository.existsByUsername(application.getUsername())) {
            throw new RuntimeException("Không thể duyệt vì username đã được dùng");
        }

        if (userRepository.existsByEmail(application.getEmail())) {
            throw new RuntimeException("Không thể duyệt vì email đã được dùng");
        }

        if (userRepository.existsByPhone(application.getPhone())) {
            throw new RuntimeException("Không thể duyệt vì số điện thoại đã được dùng");
        }

        Role customerRole = getOrCreateRole("ROLE_CUSTOMER");
        Role staffRole = getOrCreateRole("ROLE_STAFF");

        User user = new User();
        user.setUsername(application.getUsername());
        user.setPassword(application.getPasswordHash());
        user.setFullName(application.getFullName());
        user.setEmail(application.getEmail());
        user.setPhone(application.getPhone());
        user.setEnabled(true);
        user.setStatus("ACTIVE");
        user.setDesiredPosition(application.getDesiredPosition());
        user.setStaffApplicationStatus("APPROVED");
        user.setStaffPosition(staffPosition);
        user.getRoles().add(customerRole);
        user.getRoles().add(staffRole);

        User savedUser = userRepository.save(user);

        application.setStatus("APPROVED");
        application.setCreatedUserId(savedUser.getId());
        application.setAdminNote(adminNote);
    }

    private void rejectApplication(StaffApplication application, String adminNote) {
        application.setStatus("REJECTED");
        application.setAdminNote(adminNote);
    }

    private Role getOrCreateRole(String roleName) {
        return roleRepository.findByName(roleName)
                .orElseGet(() -> roleRepository.save(new Role(roleName)));
    }

    private boolean matchesKeyword(StaffApplication application, String keyword) {
        return contains(application.getUsername(), keyword)
                || contains(application.getFullName(), keyword)
                || contains(application.getEmail(), keyword)
                || contains(application.getPhone(), keyword)
                || contains(application.getDesiredPosition(), keyword)
                || contains(application.getStatus(), keyword);
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private StaffApplicationResponse mapToResponse(StaffApplication application) {
        return StaffApplicationResponse.builder()
                .id(application.getId())
                .username(application.getUsername())
                .fullName(application.getFullName())
                .email(application.getEmail())
                .phone(application.getPhone())
                .desiredPosition(application.getDesiredPosition())
                .status(application.getStatus())
                .adminNote(application.getAdminNote())
                .createdUserId(application.getCreatedUserId())
                .createdAt(application.getCreatedAt())
                .updatedAt(application.getUpdatedAt())
                .build();
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
}