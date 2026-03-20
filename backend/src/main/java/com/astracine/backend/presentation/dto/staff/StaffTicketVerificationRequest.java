package com.astracine.backend.presentation.dto.staff;

import lombok.Data;

@Data
public class StaffTicketVerificationRequest {

    // 1. DTO hứng dữ liệu từ máy quét gửi lên
    private String qrCode;
}
