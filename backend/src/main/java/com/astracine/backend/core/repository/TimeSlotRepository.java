package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.astracine.backend.core.entity.TimeSlot;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {

    @Query("SELECT t FROM TimeSlot t " +
            "WHERE (" +
            "   (t.startTime <= t.endTime AND :time >= t.startTime AND :time <= t.endTime) " +
            "   OR " +
            "   (t.startTime > t.endTime AND (:time >= t.startTime OR :time <= t.endTime))" +
            ") " +
            "ORDER BY t.startTime DESC")
    List<TimeSlot> findMatchingByTime(@Param("time") LocalTime time);

    @Query("SELECT t FROM TimeSlot t WHERE t.startTime < :endTime AND t.endTime > :startTime")
    List<TimeSlot> findOverlapping(@Param("startTime") LocalTime startTime, @Param("endTime") LocalTime endTime);

    @Query("SELECT t FROM TimeSlot t WHERE t.id <> :id AND t.startTime < :endTime AND t.endTime > :startTime")
    List<TimeSlot> findOverlappingExcludingId(@Param("id") Long id,
                                              @Param("startTime") LocalTime startTime,
                                              @Param("endTime") LocalTime endTime);
}
