package com.astracine.backend.core.service;

import java.util.List;
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
    public List<AdminUserManagementResponse> getAllCustomers(String keyword) {
        List<User> users = userRepository.findAll();
        return users.stream()
                .filter(user -> user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ROLE_CUSTOMER")))
                // search keyword (optional)
                .filter(user -> keyword == null
                || user.getUsername().toLowerCase().contains(keyword.toLowerCase())
                || user.getEmail().toLowerCase().contains(keyword.toLowerCase())
                || (user.getPhone() != null && user.getPhone().toLowerCase().contains(keyword.toLowerCase()))
                || (user.getFullName() != null 
    && user.getFullName().toLowerCase().contains(keyword.toLowerCase())))
                .map(this::mapToResponse)
                .collect(Collectors.toList());

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
