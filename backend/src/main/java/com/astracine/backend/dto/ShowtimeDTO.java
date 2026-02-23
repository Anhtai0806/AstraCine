package com.astracine.backend.dto;

import com.astracine.backend.enums.SeatBookingStatus;
import com.astracine.backend.enums.SeatType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ShowtimeDTO {

    // ================== REQUEST ==================
    /** DTO tạo suất chiếu mới */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "ID phim không được để trống")
        private Long movieId;

        @NotNull(message = "ID phòng không được để trống")
        private Long roomId;

        @NotNull(message = "Thời gian bắt đầu không được để trống")
        @Future(message = "Thời gian bắt đầu phải trong tương lai")
        private LocalDateTime startTime;
    }
    // ================== RESPONSE ==================
    /** DTO trả về thông tin cơ bản của suất chiếu */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long movieId;
        private Long roomId;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String status;

        private String movieTitle;
        private String roomName;
        private Integer movieDuration;
    }
    /** DTO trả về SƠ ĐỒ GHẾ (Booking Map) - Cấu trúc lồng nhau */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatMapResponse {
        private Long showtimeId;
        private String movieTitle;
        private LocalDateTime startTime;
        private String timeSlotName;
        private BigDecimal multiplier; // Hệ số giá (VD: 1.2)
        private List<SeatRow> seatRows; // Danh sách các hàng ghế
    }
    /** Class con: Đại diện cho 1 hàng ghế (VD: Hàng A có 10 ghế) */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatRow {
        private String rowLabel; // A, B, C...
        private List<SeatInfo> seats;
    }
    /** Class con: Đại diện cho 1 chiếc ghế cụ thể trong suất chiếu */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatInfo {
        private Long showtimeSeatId; // ID này dùng để book vé
        private String rowLabel;
        private Integer columnNumber;
        private SeatType type;
        private BigDecimal basePrice; // Giá gốc
        private BigDecimal finalPrice; // Giá cuối (đã nhân hệ số)
        private SeatBookingStatus status; // AVAILABLE, SOLD...
    }
}