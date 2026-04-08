package com.astracine.backend.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

import com.astracine.backend.core.enums.SeatStatus;
import com.astracine.backend.core.enums.SeatType;

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

        private String screenType; // 2D, 3D, IMAX (optional)

        @DecimalMin(value = "0.50", message = "Hệ số giá phải >= 0.50")
        @DecimalMax(value = "5.00", message = "Hệ số giá phải <= 5.00")
        private BigDecimal priceMultiplier; // default 1.00
    }

    /**
     * DTO dùng để cập nhật phòng — CHỈ cho phép sửa name + screenType +
     * priceMultiplier
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "Tên phòng không được để trống")
        private String name;

        private String screenType; // 2D, 3D, IMAX (optional)

        @DecimalMin(value = "0.50", message = "Hệ số giá phải >= 0.50")
        @DecimalMax(value = "5.00", message = "Hệ số giá phải <= 5.00")
        private BigDecimal priceMultiplier;
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
        private String screenType;
        private BigDecimal priceMultiplier;
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
