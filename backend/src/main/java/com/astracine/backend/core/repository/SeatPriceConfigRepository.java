package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.SeatPriceConfig;
import com.astracine.backend.core.enums.SeatType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SeatPriceConfigRepository extends JpaRepository<SeatPriceConfig, SeatType> {
}
