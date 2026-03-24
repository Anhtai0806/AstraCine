package com.astracine.backend.presentation.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Đại diện một combo trong giỏ hàng khi thanh toán.
 * Được truyền từ FE khi tạo PayOS payment link để lưu vào invoice sau.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComboCartItemDTO {
    private Long comboId;
    private String name;
    private Integer quantity;
    private BigDecimal price; // đơn giá 1 item
    private BigDecimal subtotal; // = price * quantity
}
