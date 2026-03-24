package com.astracine.backend.presentation.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserManagementResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private Boolean enabled;
    private String lockReason;
    private String desiredPosition;
    private String staffApplicationStatus;
    private String staffPosition;
    private Boolean staff;
    private Boolean blankStaffAccount;
    private String staffTemporaryPassword;
    private LocalDateTime staffCredentialsIssuedAt;
    private Set<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
