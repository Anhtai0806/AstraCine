package com.astracine.backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalTime;

@Data
public class TimeSlotDTO {
    private Long id;
    private String name;
    private LocalTime startTime;
    private LocalTime endTime;
    private BigDecimal priceMultiplier; // Hệ số giá (VD: 1.0, 1.2, 0.8)
    private String status; // "ACTIVE" hoặc "INACTIVE"
}