package com.astracine.backend.presentation.dto.staff;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffComboSaleResponse {

    private Long invoiceId;
    private Long staffId;
    private String staffUsername;
    private String customerUsername;
    private String paymentMethod;
    private String status;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;
    private List<LineItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineItem {
        private Long comboId;
        private String comboName;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal subtotal;
    }
}