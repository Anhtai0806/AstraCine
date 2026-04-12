package com.astracine.backend.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AdminStaffDecisionRequest {
    @NotBlank(message = "Action is required")
    private String action;
    private String adminNote;
    private String staffPosition;
    private String employmentType;
    private Boolean seasonalOnly;
    private LocalDate seasonalStartDate;
    private LocalDate seasonalEndDate;
}
