package com.astracine.backend.presentation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @Min(value = 1, message = "Max usage per user must be at least 1 if specified")
    private Integer maxUsagePerUser;

    private Integer currentUsage;

    private String description;

    @DecimalMin(value = "0", message = "Minimum order amount must be 0 or greater")
    private BigDecimal minOrderAmount;

    @DecimalMin(value = "0.01", message = "Maximum discount amount must be greater than 0 if specified")
    private BigDecimal maxDiscountAmount;

    @jakarta.validation.constraints.Pattern(regexp = "^(ALL|TICKET|COMBO)$", message = "Applicable to must be ALL, TICKET, or COMBO")
    private String applicableTo;

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
