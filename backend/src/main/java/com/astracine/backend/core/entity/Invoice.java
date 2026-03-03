package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** customer_id nullable — guest checkout */
    @Column(name = "customer_id")
    private Long customerId;

    /** staff_id NOT NULL — dùng system user id=1 nếu guest */
    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    /** DRAFT / PAID / CANCELLED */
    @Builder.Default
    @Column(length = 20)
    private String status = "PAID";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
