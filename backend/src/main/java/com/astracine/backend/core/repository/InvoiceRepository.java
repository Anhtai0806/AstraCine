package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    List<Invoice> findByCustomerUsernameOrderByCreatedAtDesc(String customerUsername);

    @Query(value = "SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = :status", nativeQuery = true)
    BigDecimal sumTotalRevenueByStatus(@Param("status") String status);

    @Query(value = "SELECT DATE(created_at) as date, SUM(total_amount) as total " +
           "FROM invoices WHERE status = :status AND created_at >= :startDate " +
           "GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC", nativeQuery = true)
    List<Object[]> findRevenueByDateRange(@Param("status") String status, @Param("startDate") LocalDateTime startDate);

    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m') as date, SUM(total_amount) as total " +
           "FROM invoices WHERE status = :status AND created_at >= :startDate " +
           "GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC", nativeQuery = true)
    List<Object[]> findRevenueByMonthRange(@Param("status") String status, @Param("startDate") LocalDateTime startDate);
}
