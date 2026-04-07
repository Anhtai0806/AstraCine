package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.HolidayPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface HolidayPeriodRepository extends JpaRepository<HolidayPeriod, Long> {

    @Query("""
        SELECT h FROM HolidayPeriod h
        WHERE h.active = true
          AND :businessDate BETWEEN h.startDate AND h.endDate
        ORDER BY h.startDate ASC
    """)
    List<HolidayPeriod> findActiveByBusinessDate(@Param("businessDate") LocalDate businessDate);
}
