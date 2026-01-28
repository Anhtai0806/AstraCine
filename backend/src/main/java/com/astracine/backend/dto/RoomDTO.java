package com.astracine.backend.dto;

import com.astracine.backend.enums.SeatStatus;
import com.astracine.backend.enums.SeatType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

public class RoomDTO {

    // ================== REQUEST (Dữ liệu gửi lên) ==================

    /** DTO dùng để tạo phòng mới */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Tên phòng không được để trống")
        private String name;

        @NotNull(message = "Số hàng không được để trống")
        @Min(value = 1, message = "Số hàng phải lớn hơn 0")
        private Integer totalRows;

        @NotNull(message = "Số cột không được để trống")
        @Min(value = 1, message = "Số cột phải lớn hơn 0")
        private Integer totalColumns;
    }

    // ================== RESPONSE (Dữ liệu trả về) ==================

    /** DTO trả về thông tin chi tiết phòng (Entity -> DTO) */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailResponse {
        private Long id;
        private String name;
        private Integer totalRows;
        private Integer totalColumns;
        private String status;
    }

    /** DTO trả về thông tin ghế cơ bản (dùng cho Admin quản lý) */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatResponse {
        private Long id;
        private String rowLabel;
        private Integer columnNumber;
        private SeatType seatType;
        private BigDecimal basePrice;
        private SeatStatus status;
    }
}


