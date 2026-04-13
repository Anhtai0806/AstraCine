package com.astracine.backend.core.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "promotions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "discount_type", length = 20)
    private String discountType; // PERCENTAGE or FIXED

    @Column(name = "discount_value", precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(length = 20)
    private String status; // ACTIVE or INACTIVE

    @Column(name = "max_usage")
    private Integer maxUsage; // NULL means unlimited

    @Column(name = "max_usage_per_user")
    private Integer maxUsagePerUser; // NULL means unlimited per user

    @Column(name = "current_usage")
    private Integer currentUsage = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "min_order_amount", precision = 12, scale = 2)
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount; // NULL means no cap

    @Column(name = "applicable_to", length = 20)
    private String applicableTo = "ALL";
}
