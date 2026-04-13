package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.InvoicePromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoicePromotionRepository
        extends JpaRepository<InvoicePromotion, InvoicePromotion.InvoicePromotionId> {

    @Query("""
            SELECT COUNT(ip) FROM InvoicePromotion ip
            WHERE ip.promotion.id = :promotionId
              AND ip.invoice.customerUsername = :customerUsername
              AND ip.invoice.status <> 'CANCELLED'
            """)
    long countUsageByPromotionAndCustomerUsername(
            @Param("promotionId") Long promotionId,
            @Param("customerUsername") String customerUsername);

    @Query("""
            SELECT COUNT(ip) FROM InvoicePromotion ip
            WHERE ip.promotion.id = :promotionId
              AND ip.invoice.customerUsername IN :customerUsernames
              AND ip.invoice.status <> 'CANCELLED'
            """)
    long countUsageByPromotionAndCustomerUsernames(
            @Param("promotionId") Long promotionId,
            @Param("customerUsernames") List<String> customerUsernames);
}
