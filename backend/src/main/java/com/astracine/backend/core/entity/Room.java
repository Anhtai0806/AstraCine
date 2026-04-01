package com.astracine.backend.core.entity;

import com.astracine.backend.core.enums.RoomStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "total_rows", nullable = false)
    private Integer totalRows;

    @Column(name = "total_columns", nullable = false)
    private Integer totalColumns;

    @Column(name = "screen_type", length = 20)
    private String screenType;

    @Column(name = "price_multiplier", nullable = false, precision = 5, scale = 2, columnDefinition = "DECIMAL(5,2) NOT NULL DEFAULT 1.00")
    private BigDecimal priceMultiplier;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RoomStatus status;

    public Room(String name, Integer totalRows, Integer totalColumns, String screenType, BigDecimal priceMultiplier) {
        this.name = name;
        this.totalRows = totalRows;
        this.totalColumns = totalColumns;
        this.screenType = screenType;
        this.priceMultiplier = priceMultiplier != null ? priceMultiplier : BigDecimal.ONE;
        this.status = RoomStatus.ACTIVE;
    }
}
