package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.ScheduleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleAssignmentRepository extends JpaRepository<ScheduleAssignment, Long> {
    List<ScheduleAssignment> findByPlan_IdOrderByShiftStartAscAssignedPositionAsc(Long planId);

    @Query("SELECT sa FROM ScheduleAssignment sa WHERE sa.plan.businessDate = :businessDate ORDER BY sa.shiftStart ASC, sa.assignedPosition ASC")
    List<ScheduleAssignment> findByBusinessDate(@Param("businessDate") LocalDate businessDate);

    @Query("SELECT sa FROM ScheduleAssignment sa WHERE sa.staff.id = :staffId AND sa.shiftStart < :toTime AND sa.shiftEnd > :fromTime ORDER BY sa.shiftStart ASC")
    List<ScheduleAssignment> findForStaffBetween(@Param("staffId") Long staffId,
                                                 @Param("fromTime") LocalDateTime fromTime,
                                                 @Param("toTime") LocalDateTime toTime);

    @Query("""
            SELECT sa
            FROM ScheduleAssignment sa
            JOIN FETCH sa.plan p
            JOIN FETCH sa.staff s
            LEFT JOIN FETCH sa.shiftTemplate st
            WHERE sa.staff.id = :staffId
              AND sa.shiftStart < :toTime
              AND sa.shiftEnd > :fromTime
            ORDER BY sa.shiftStart ASC
            """)
    List<ScheduleAssignment> findForStaffBetweenDetailed(@Param("staffId") Long staffId,
                                                         @Param("fromTime") LocalDateTime fromTime,
                                                         @Param("toTime") LocalDateTime toTime);

    @Query("SELECT sa FROM ScheduleAssignment sa WHERE sa.shiftStart < :toTime AND sa.shiftEnd > :fromTime")
    List<ScheduleAssignment> findAllBetween(@Param("fromTime") LocalDateTime fromTime,
                                            @Param("toTime") LocalDateTime toTime);

    @Query("""
            SELECT sa
            FROM ScheduleAssignment sa
            JOIN FETCH sa.plan p
            JOIN FETCH sa.staff s
            LEFT JOIN FETCH sa.shiftTemplate st
            WHERE sa.plan.businessDate = :businessDate
            ORDER BY sa.shiftStart ASC, sa.assignedPosition ASC
            """)
    List<ScheduleAssignment> findByBusinessDateDetailed(@Param("businessDate") LocalDate businessDate);

    @Query("""
            SELECT sa
            FROM ScheduleAssignment sa
            JOIN FETCH sa.plan p
            JOIN FETCH sa.staff s
            LEFT JOIN FETCH sa.shiftTemplate st
            WHERE sa.id = :assignmentId
            """)
    Optional<ScheduleAssignment> findDetailedById(@Param("assignmentId") Long assignmentId);

    @Query("""
        SELECT sa
        FROM ScheduleAssignment sa
        JOIN FETCH sa.plan p
        JOIN FETCH sa.staff s
        LEFT JOIN FETCH sa.shiftTemplate st
        WHERE sa.shiftStart <= :latestCheckInDeadline
          AND sa.status IN (
              com.astracine.backend.core.enums.ScheduleAssignmentStatus.PUBLISHED,
              com.astracine.backend.core.enums.ScheduleAssignmentStatus.CONFIRMED
          )
        ORDER BY sa.shiftStart ASC
        """)
    List<ScheduleAssignment> findAssignmentsEligibleForAutoAbsent(@Param("latestCheckInDeadline") LocalDateTime latestCheckInDeadline);
}
