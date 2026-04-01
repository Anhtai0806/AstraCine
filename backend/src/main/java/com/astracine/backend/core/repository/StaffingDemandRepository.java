package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.StaffingDemand;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface StaffingDemandRepository extends JpaRepository<StaffingDemand, Long> {
    List<StaffingDemand> findByBusinessDateOrderByWindowStartAsc(LocalDate businessDate);
    void deleteByBusinessDate(LocalDate businessDate);
}
