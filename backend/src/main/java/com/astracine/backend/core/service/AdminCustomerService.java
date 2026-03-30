package com.astracine.backend.core.service;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.admin.AdminUserManagementResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminCustomerService {

    private final UserRepository userRepository;

    // get all customers
   public Page<AdminUserManagementResponse> getAllCustomers(int page, int size, String keyword) {

    Pageable pageable = PageRequest.of(page, size);

    Page<User> users;

    if (keyword != null && !keyword.isBlank()) {
        users = userRepository.searchCustomers(keyword, pageable);
    } else {
        users = userRepository.findCustomers(pageable);
    }

    return users.map(this::mapToResponse);
}

    //Lock customer account
    @Transactional
    public String lockCustomer(Long userId, String reason) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isCustomer = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ROLE_CUSTOMER"));

        if (!isCustomer) {
            throw new RuntimeException("This user is not a CUSTOMER");
        }

        user.setStatus("LOCKED");
        user.setEnabled(false);
        user.setLockReason(reason);

        userRepository.save(user);

        return "Customer locked successfully";
    }

    //Unlock customer account
    @Transactional
    public String unlockCustomer(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setStatus("ACTIVE");
        user.setEnabled(true);
        user.setLockReason(null);
        userRepository.save(user);
        return "Customer unlocked successfully";
    }

    // Map User entity to AdminUserManagementResponse DTO
    private AdminUserManagementResponse mapToResponse(User user) {
        return AdminUserManagementResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phone(user.getPhone())
                .fullName(user.getFullName() != null ? user.getFullName() : "")
                .status(user.getStatus())
                .enabled(user.getEnabled())
                .lockReason(user.getLockReason())
                .roles(user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(Collectors.toSet()))
                .build();

    }
}
