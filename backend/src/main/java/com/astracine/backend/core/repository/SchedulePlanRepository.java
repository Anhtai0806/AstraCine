package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.SchedulePlan;
import com.astracine.backend.core.enums.SchedulePlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SchedulePlanRepository extends JpaRepository<SchedulePlan, Long> {
    List<SchedulePlan> findByBusinessDateOrderByGeneratedAtDesc(LocalDate businessDate);
    Optional<SchedulePlan> findFirstByBusinessDateAndStatusOrderByGeneratedAtDesc(LocalDate businessDate, SchedulePlanStatus status);
}
