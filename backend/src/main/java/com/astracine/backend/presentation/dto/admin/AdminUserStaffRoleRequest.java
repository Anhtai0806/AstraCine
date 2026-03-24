package com.astracine.backend.presentation.dto.admin;

import lombok.Data;

@Data
public class AdminUserStaffRoleRequest {
    private String action;        // APPROVE / REVOKE / UPDATE_POSITION
    private String staffPosition; // COUNTER / CHECKIN / CONCESSION / MULTI
}