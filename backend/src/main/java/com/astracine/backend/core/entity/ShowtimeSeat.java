package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.astracine.backend.core.enums.SeatBookingStatus;

@Entity
@Table(name = "showtime_seats", uniqueConstraints = @UniqueConstraint(columnNames = { "showtime_id", "seat_id" }))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimeSeat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    /** hiện chưa map entity Booking - để Long cho đơn giản */
    @Column(name = "booking_id")
    private Long bookingId;

    // thêm cột mới final_price

    @Column(name = "final_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal finalPrice;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private SeatBookingStatus status = SeatBookingStatus.AVAILABLE;

    @Column(name = "hold_expired_at")
    private LocalDateTime holdExpiredAt;

    public ShowtimeSeat(Showtime showtime, Seat seat, BigDecimal finalPrice) {
        this.showtime = showtime;
        this.seat = seat;
        this.finalPrice = finalPrice;
        this.status = SeatBookingStatus.AVAILABLE; // Mặc định là trống
    }
}
