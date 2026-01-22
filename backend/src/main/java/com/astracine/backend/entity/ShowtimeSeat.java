package com.astracine.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "showtime_seats",
        uniqueConstraints = @UniqueConstraint(columnNames = {"showtime_id", "seat_id"})
)
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

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ShowtimeSeatStatus status = ShowtimeSeatStatus.AVAILABLE;

    @Column(name = "hold_expired_at")
    private LocalDateTime holdExpiredAt;
}
