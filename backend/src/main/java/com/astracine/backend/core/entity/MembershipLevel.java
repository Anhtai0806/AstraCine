package com.astracine.backend.core.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "memberships")
public class MembershipLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // MEMBER, ELITE, VIP, VVIP

    // 💰 điều kiện lên hạng
    @Column(name = "min_total_spent")
    private BigDecimal minTotalSpent;

    // 🎯 giảm giá %
    @Column(name = "discount_percent")
    private int discountPercent;

    // ⭐ tỉ lệ tích điểm
    @Column(name = "ticket_point_rate")
    private double ticketPointRate;

    @Column(name = "combo_point_rate")
    private double comboPointRate;
}