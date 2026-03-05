package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByInvoiceId(Long invoiceId);
}
