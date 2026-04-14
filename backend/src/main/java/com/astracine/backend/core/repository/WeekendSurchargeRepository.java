package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.WeekendSurchargeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WeekendSurchargeRepository extends JpaRepository<WeekendSurchargeConfig, Long> {
}
