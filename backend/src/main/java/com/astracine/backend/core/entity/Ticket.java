package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_seat_id", nullable = false, unique = true)
    private ShowtimeSeat showtimeSeat;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode;

    /** VALID / USED / CANCELLED */
    @Builder.Default
    @Column(length = 20)
    private String status = "VALID";

}
