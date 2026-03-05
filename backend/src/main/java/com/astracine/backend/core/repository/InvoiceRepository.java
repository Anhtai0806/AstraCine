package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByCustomerUsernameOrderByCreatedAtDesc(String customerUsername);
}
