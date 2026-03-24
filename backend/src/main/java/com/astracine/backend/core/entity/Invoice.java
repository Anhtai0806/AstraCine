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

    /** Tên đăng nhập của customer — dùng để query lịch sử */
    @Column(name = "customer_username", length = 100)
    private String customerUsername;

    /**
     * staff_id nullable — null khi customer tự đặt online, có giá trị khi staff hỗ trợ
     */
    @Column(name = "staff_id", nullable = true)
    private Long staffId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = true)
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