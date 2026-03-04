package com.astracine.backend.presentation.controller.admin;

import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.admin.AdminUserResponse;
import com.astracine.backend.presentation.dto.admin.LockRequest;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;

    // ================= LIST USER (15 per page) =================
    @GetMapping
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page) {

        Pageable pageable = PageRequest.of(page, 15, Sort.by("id").descending());

        Page<User> userPage = userRepository.findAll(pageable);

        Page<AdminUserResponse> response
                = userPage.map(this::mapToResponse);

        return ResponseEntity.ok(response);
    }

    // ================= LOCK ACCOUNT =================
    @PutMapping("/{id}/lock")
    public ResponseEntity<String> lockUser(
            @PathVariable Long id,
            @RequestBody LockRequest request) {

        if (request.getReason() == null || request.getReason().isBlank()) {
            return ResponseEntity.badRequest()
                    .body("Lock reason is required");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isAdmin = user.getRoles()
                .stream()
                .anyMatch(role -> role.getName().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return ResponseEntity.badRequest()
                    .body("Cannot lock ADMIN account");
        }

        user.setStatus("LOCKED"); // thêm dòng này
        user.setEnabled(false);   // giữ cũng được
        user.setLockReason(request.getReason());

        userRepository.save(user);

        return ResponseEntity.ok("User locked successfully");
    }

    // ================= UNLOCK ACCOUNT =================
    @PutMapping("/{id}/unlock")
    public ResponseEntity<String> unlockUser(@PathVariable Long id) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus("ACTIVE");
        user.setEnabled(true);
        user.setLockReason(null);

        userRepository.save(user);

        return ResponseEntity.ok("User unlocked successfully");
    }

    // ================= MAPPER =================
    private AdminUserResponse mapToResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .enabled(user.isEnabled())
                .lockReason(user.getLockReason())
                .roles(
                        user.getRoles()
                                .stream()
                                .map(role -> role.getName())
                                .collect(Collectors.toSet())
                )
                .build();
    }
}
