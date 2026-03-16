package com.astracine.backend.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminStaffDecisionRequest {
    @NotBlank(message = "Action is required")
    private String action;
    private String adminNote;
    private String staffPosition;
}
