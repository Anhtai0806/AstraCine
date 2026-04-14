package com.astracine.backend.presentation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeekendSurchargeDTO {
    private Boolean enabled;
    private BigDecimal surchargeAmount;
}
