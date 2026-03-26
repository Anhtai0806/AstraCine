package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "combos")
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class Combo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(length = 20)
    private String status = "ACTIVE";

    @Column(name = "stock_quantity")
    private Integer stockQuantity = 0;

    public Combo(String name, BigDecimal price, String status) {
        this.name = name;
        this.price = price;
        this.status = status;
    }
}
