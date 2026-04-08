package com.astracine.backend.presentation.dto.payment;

import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PayOSCreateRequest {

    @NotBlank(message = "holdId không được để trống")
    private String holdId;

    @NotBlank(message = "returnUrl không được để trống")
    private String returnUrl;

    @NotBlank(message = "cancelUrl không được để trống")
    private String cancelUrl;

    /**
     * Số tiền thực tế cần thanh toán (sau giảm giá, sau combo).
     */
    @Min(value = 0, message = "Số tiền thanh toán tối thiểu 0đ")
    private Long amount;

    /** Mã khuyến mãi đã áp dụng (tùy chọn) */
    private String promotionCode;

    /** Số tiền được giảm (tùy chọn, để hiển thị trong PayOS items) */
    private Long discountAmount;

    /** Danh sách combo đã chọn — để lưu vào invoice_combos sau thanh toán */
    private List<ComboCartItemDTO> comboItems;

    // 👇 THÊM TRƯỜNG NÀY ĐỂ HỨNG SỐ ĐIỂM TỪ FRONTEND
    private Integer pointsUsed; 
}