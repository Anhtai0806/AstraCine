package com.astracine.backend.presentation.dto;

import com.astracine.backend.core.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatPriceConfigDTO {
    private SeatType seatType;
    private BigDecimal basePrice;
}
