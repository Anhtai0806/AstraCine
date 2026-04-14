package com.astracine.backend.presentation.dto;

import com.astracine.backend.core.enums.SeatStatus;
import com.astracine.backend.core.enums.SeatType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatResponseDTO {
    private Long id;
    private Long roomId;
    private String rowLabel;
    private Integer columnNumber;
    private SeatType seatType;
    private SeatStatus status;
    private Long pairedSeatId;
    private BigDecimal basePrice;
}
