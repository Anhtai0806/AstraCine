package com.astracine.backend.presentation.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevenuePointDTO {
    private String date;
    private BigDecimal total;
}
