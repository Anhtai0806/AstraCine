package com.astracine.backend.presentation.dto.staff;

import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
public class StaffCounterBookingRequest {

    @NotBlank(message = "Hold ID không được để trống")
    private String holdId;

    @NotNull(message = "Tổng thanh toán không được để trống")
    @DecimalMin(value = "0", inclusive = true, message = "Tổng thanh toán phải lớn hơn hoặc bằng 0")
    private BigDecimal totalAmount;

    private String promotionCode;

    private String customerName;

    private String customerEmail;

    private String customerPhone;

    @NotBlank(message = "Phương thức thanh toán không được để trống")
    private String paymentMethod;

    private List<ComboCartItemDTO> comboItems = new ArrayList<>();
}
