package com.astracine.backend.core.entity;

import com.astracine.backend.core.enums.SeatType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "seat_price_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatPriceConfig {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", length = 20)
    private SeatType seatType;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;
}
