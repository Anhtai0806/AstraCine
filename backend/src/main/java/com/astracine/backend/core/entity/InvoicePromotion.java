package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "invoice_promotions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(InvoicePromotion.InvoicePromotionId.class)
public class InvoicePromotion {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id", nullable = false)
    private Promotion promotion;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoicePromotionId implements Serializable {
        private Long invoice;
        private Long promotion;
    }
}
