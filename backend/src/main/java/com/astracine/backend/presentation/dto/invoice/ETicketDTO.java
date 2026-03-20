package com.astracine.backend.presentation.dto.invoice;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * DTO chứa toàn bộ thông tin E-ticket để frontend hiển thị sau thanh toán.
 */
@Data
@Builder
public class ETicketDTO {

    private String movieTitle;
    private String ageRating;
    private Integer durationMinutes;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime showDate;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startTime;

    private String roomName;

    /** Danh sách ghế, e.g. "H5, H6" */
    private String seats;

    /** Loại ghế chính (VIP / PREMIUM / STANDARD) */
    private String seatType;

    /** Mã vé duy nhất, e.g. "TICKET-12-34" */
    private String ticketCode;

    /** QR code dạng text (hoặc base64 image) */
    private String qrCode;

    private BigDecimal totalAmount;

    /** Mã đơn PayOS */
    private String orderCode;

    private String combos;
}
