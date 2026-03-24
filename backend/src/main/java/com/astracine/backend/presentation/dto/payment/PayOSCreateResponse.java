package com.astracine.backend.presentation.dto.payment;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayOSCreateResponse {

    /** Order code (số nguyên) do backend sinh, dùng để map với holdId */
    private long orderCode;

    /** PayOS checkout URL - redirect user đến đây để thanh toán */
    private String checkoutUrl;

    /** PayOS QR code data URL */
    private String qrCode;

    /** PENDING / PAID / CANCELLED */
    private String status;
}
