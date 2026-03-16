package com.astracine.backend.presentation.dto.staff;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffCounterBookingResponse {
    private Long invoiceId;
    private String invoiceStatus;
    private String paymentMethod;
    private BigDecimal totalAmount;
    private String customerDisplay;
    private LocalDateTime createdAt;

    private Long showtimeId;
    private String movieTitle;
    private String roomName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private List<ComboItem> combos;
    private List<TicketItem> tickets;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComboItem {
        private Long comboId;
        private String comboName;
        private Integer quantity;
        private BigDecimal price;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketItem {
        private Long ticketId;
        private String ticketCode;
        private String ticketStatus;
        private String seatCode;
        private String seatType;
        private BigDecimal price;
        private String qrImageBase64;
    }
}
