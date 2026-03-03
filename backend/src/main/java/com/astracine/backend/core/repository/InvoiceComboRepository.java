package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.InvoiceCombo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceComboRepository extends JpaRepository<InvoiceCombo, Long> {
}
