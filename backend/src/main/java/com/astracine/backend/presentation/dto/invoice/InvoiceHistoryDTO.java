package com.astracine.backend.presentation.dto.invoice;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class InvoiceHistoryDTO {

    private Long invoiceId;
    private String status;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private String orderCode;

    // Thông tin khách hàng (dùng cho Admin view)
    private String customerUsername;
    private String paymentMethod;  // PAYOS / CASH / CARD
    
    // Thông tin phim / suất chiếu
    private Long showtimeId;
    private Long movieId;
    private String movieTitle;
    private String moviePosterUrl;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String roomName;
    

    // Danh sách ghế
    private List<SeatItem> seats;

    // Danh sách combo
    private List<ComboItem> combos;

    @Data
    @Builder
    public static class SeatItem {
        private String seatCode; // e.g. "A1"
        private String seatType; // STANDARD / PREMIUM / VIP
        private BigDecimal price;
    }

    @Data
    @Builder
    public static class ComboItem {
        private String comboName;
        private Integer quantity;
        private BigDecimal price; // đơn giá
    }
}
