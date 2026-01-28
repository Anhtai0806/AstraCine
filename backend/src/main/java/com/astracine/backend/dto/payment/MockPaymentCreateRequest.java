package com.astracine.backend.dto.payment;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class MockPaymentCreateRequest {
    @NotBlank
    private String holdId;
}
