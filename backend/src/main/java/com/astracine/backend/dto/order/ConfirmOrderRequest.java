package com.astracine.backend.dto.order;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConfirmOrderRequest {
    @NotBlank
    private String holdId;

    /** optional - bạn sẽ map sang payment/invoice về sau */
    private String paymentRef;
}
