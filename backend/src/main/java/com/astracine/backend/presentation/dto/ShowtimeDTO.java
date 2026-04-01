package com.astracine.backend.presentation.dto;

import com.astracine.backend.core.enums.SeatBookingStatus;
import com.astracine.backend.core.enums.SeatType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class ShowtimeDTO {

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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatMapResponse {
        private Long showtimeId;
        private String movieTitle;
        private LocalDateTime startTime;
        private String timeSlotName;
        private BigDecimal multiplier;
        private List<SeatRow> seatRows;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatRow {
        private String rowLabel;
        private List<SeatInfo> seats;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatInfo {
        private Long showtimeSeatId;
        private String rowLabel;
        private Integer columnNumber;
        private SeatType type;
        private BigDecimal basePrice;
        private BigDecimal finalPrice;
        private SeatBookingStatus status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkCreateRequest {
        @NotNull(message = "ID phim không được để trống")
        private Long movieId;

        @NotNull(message = "ID phòng không được để trống")
        private Long roomId;

        @NotNull(message = "Ngày bắt đầu không được để trống")
        @FutureOrPresent(message = "Ngày bắt đầu phải từ hôm nay trở đi")
        private LocalDate startDate;

        @NotNull(message = "Ngày kết thúc không được để trống")
        @FutureOrPresent(message = "Ngày kết thúc phải từ hôm nay trở đi")
        private LocalDate endDate;

        @NotNull(message = "Danh sách khung giờ không được để trống")
        private List<LocalTime> startTimes;

        /** Thời gian đệm (phút) giữa các suất, mặc định 15 */
        private Integer bufferMinutes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkCreateResponse {
        private int createdCount;
        private int skippedCount;
        private String message;
        private List<Response> createdShowtimes;
        private List<String> skippedReasons;
    }
}
