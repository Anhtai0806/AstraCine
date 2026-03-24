package com.astracine.backend.presentation.dto.staff;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class StaffComboSaleRequest {

    /**
     * Có thể để trống nếu khách mua lẻ tại quầy, không muốn gắn vào user nào.
     * Nếu nhập thì nên là username khách hàng đã có tài khoản.
     */
    private String customerUsername;

    @NotBlank(message = "Vui lòng chọn phương thức thanh toán")
    private String paymentMethod; // CASH / CARD

    @Valid
    @NotEmpty(message = "Vui lòng chọn ít nhất 1 combo")
    private List<Item> items;

    @Data
    public static class Item {
        @NotNull(message = "comboId là bắt buộc")
        private Long comboId;

        @NotNull(message = "Số lượng là bắt buộc")
        @Min(value = 1, message = "Số lượng phải lớn hơn 0")
        private Integer quantity;
    }
}