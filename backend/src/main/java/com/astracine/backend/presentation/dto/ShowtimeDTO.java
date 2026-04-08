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
    public static class GenerateRequest {
        @NotNull(message = "Ngày tạo lịch không được để trống")
        @FutureOrPresent(message = "Ngày tạo lịch phải từ hôm nay trở đi")
        private LocalDate scheduleDate;

        private LocalTime openingTime;

        private LocalTime closingTime;

        private List<Long> roomIds;

        private List<Long> movieIds;
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

    /**
     * Response cho việc tạo/cập nhật showtime thủ công (Option B - Soft Warn).
     * Nếu admin cố tình xếp cùng phim liên tiếp trong một phòng,
     * hệ thống vẫn cho phép nhưng đính kèm cảnh báo trong trường {@code warning}.
     * Khi không có vấn đề gì, {@code warning} sẽ là {@code null}.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualCreateResponse {
        private Response showtime;

        /** Null nếu không có vấn đề. Chứa message cảnh báo nếu vi phạm soft rule. */
        private String warning;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateResponse {
        private LocalDate scheduleDate;
        private Integer cleanupMinutes;
        private Integer createdCount;
        private Boolean preview;
        private String message;
        private List<Response> createdShowtimes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmGenerateRequest {
        @NotNull(message = "Ngày tạo lịch không được để trống")
        private LocalDate scheduleDate;

        @NotNull(message = "Danh sách suất chiếu xem trước không được để trống")
        private List<ConfirmShowtimeItem> showtimes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmShowtimeItem {
        @NotNull(message = "ID phim không được để trống")
        private Long movieId;

        @NotNull(message = "ID phòng không được để trống")
        private Long roomId;

        @NotNull(message = "Thời gian bắt đầu không được để trống")
        private LocalDateTime startTime;
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
}
