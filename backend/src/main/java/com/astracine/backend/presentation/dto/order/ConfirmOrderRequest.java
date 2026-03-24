package com.astracine.backend.presentation.dto.order;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConfirmOrderRequest {

    @NotBlank
    private String holdId;

    /**
     * PayOS flow: orderCode trả về từ /api/payments/payos/create.
     * Nếu có orderCode → verify qua PayOSService.
     */
    private Long orderCode;

    /**
     * Mock flow (legacy): paymentSessionId từ /api/payments/mock.
     * Giữ lại để backward compatible.
     */
    private String paymentRef;
}
