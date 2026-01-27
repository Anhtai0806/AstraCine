package com.astracine.backend.repository;


import com.astracine.backend.entity.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.Optional;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    
    @Query("SELECT t FROM TimeSlot t " +
           "WHERE :time >= t.startTime AND :time < t.endTime")
    Optional<TimeSlot> findByTime(@Param("time") LocalTime time);
}
