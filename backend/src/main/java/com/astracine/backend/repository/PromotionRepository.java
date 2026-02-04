package com.astracine.backend.repository;

import com.astracine.backend.entity.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    Optional<Promotion> findByCode(String code);

    boolean existsByCode(String code);

    List<Promotion> findByStatus(String status);

    @Query("SELECT p FROM Promotion p WHERE p.startDate <= :date AND p.endDate >= :date")
    List<Promotion> findActivePromotionsByDate(@Param("date") LocalDate date);

    @Query("SELECT p FROM Promotion p WHERE p.code = :code AND p.status = 'ACTIVE' " +
            "AND p.startDate <= :date AND p.endDate >= :date")
    Optional<Promotion> findValidPromotionByCode(@Param("code") String code, @Param("date") LocalDate date);
}
