package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.HolidaySurcharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HolidaySurchargeRepository extends JpaRepository<HolidaySurcharge, Long> {
    List<HolidaySurcharge> findAllByOrderByStartDateDesc();
}
