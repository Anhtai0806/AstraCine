package com.astracine.backend.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LockRequest {

    @NotBlank(message = "Lock reason is required")
    private String reason;
}