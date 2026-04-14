package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "weekend_surcharge_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WeekendSurchargeConfig {

    @Id
    @Column(name = "id")
    private Long id = 1L;

    @Column(nullable = false)
    private Boolean enabled = false;

    @Column(name = "surcharge_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal surchargeAmount = BigDecimal.ZERO;
}
