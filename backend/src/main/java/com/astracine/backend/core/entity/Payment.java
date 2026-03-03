package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    /** PAYOS / CASH / CARD */
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    /** orderCode từ PayOS */
    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Column(precision = 14, scale = 2)
    private BigDecimal amount;

    /** PENDING / PAID / FAILED */
    @Column(length = 20)
    private String status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
