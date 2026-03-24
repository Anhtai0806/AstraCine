package com.astracine.backend.presentation.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PromotionDTO {

    private Long id;

    @NotBlank(message = "Promotion code is required")
    @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Code must contain only uppercase letters, numbers, underscores, and hyphens")
    private String code;

    @NotBlank(message = "Discount type is required")
    @Pattern(regexp = "^(PERCENTAGE|FIXED)$", message = "Discount type must be PERCENTAGE or FIXED")
    private String discountType;

    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0.01", message = "Discount value must be greater than 0")
    private BigDecimal discountValue;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(ACTIVE|INACTIVE)$", message = "Status must be ACTIVE or INACTIVE")
    private String status;

    @Min(value = 1, message = "Max usage must be at least 1 if specified")
    private Integer maxUsage; // NULL means unlimited

    private Integer currentUsage;

    private String description;

    @DecimalMin(value = "0", message = "Minimum order amount must be 0 or greater")
    private BigDecimal minOrderAmount;

    // Custom validation method for percentage discount
    public boolean isValidPercentageDiscount() {
        if ("PERCENTAGE".equals(discountType)) {
            return discountValue.compareTo(BigDecimal.ZERO) > 0
                    && discountValue.compareTo(new BigDecimal("100")) <= 0;
        }
        return true;
    }

    // Custom validation method for date range
    public boolean isValidDateRange() {
        if (startDate != null && endDate != null) {
            return !endDate.isBefore(startDate);
        }
        return true;
    }
}
