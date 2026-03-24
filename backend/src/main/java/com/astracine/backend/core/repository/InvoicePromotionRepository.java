package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.InvoicePromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoicePromotionRepository
        extends JpaRepository<InvoicePromotion, InvoicePromotion.InvoicePromotionId> {
}
