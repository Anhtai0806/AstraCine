package com.astracine.backend.presentation.dto.admin;

import lombok.Data;

@Data
public class AdminStaffApplicationDecisionRequest {

    private String action;      // APPROVE / REJECT
    private String adminNote;
    private String staffPosition; // COUNTER / CHECKIN / CONCESSION / MULTI
}