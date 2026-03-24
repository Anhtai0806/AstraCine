package com.astracine.backend.core.entity;

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

import com.astracine.backend.core.enums.SeatStatus;
import com.astracine.backend.core.enums.SeatType;

@Entity
@Table(name = "seats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "row_label", nullable = false, length = 5)
    private String rowLabel;

    @Column(name = "column_number", nullable = false)
    private Integer columnNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "seat_type", nullable = false, length = 20)
    private SeatType seatType;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private SeatStatus status;

    public Seat(Long roomId, String rowLabel, Integer columnNumber,
            SeatType seatType, BigDecimal basePrice) {
        this.roomId = roomId;
        this.rowLabel = rowLabel;
        this.columnNumber = columnNumber;
        this.seatType = seatType;
        this.basePrice = basePrice;
        this.status = SeatStatus.ACTIVE;
    }
}
