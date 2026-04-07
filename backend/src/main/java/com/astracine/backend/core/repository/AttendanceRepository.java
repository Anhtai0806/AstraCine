package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    @Query("""
            SELECT a
            FROM Attendance a
            JOIN FETCH a.assignment ass
            JOIN FETCH ass.plan p
            JOIN FETCH ass.staff s
            LEFT JOIN FETCH ass.shiftTemplate st
            WHERE a.assignment.id = :assignmentId
            """)
    Optional<Attendance> findWithAssignmentByAssignmentId(@Param("assignmentId") Long assignmentId);

    @Query("""
            SELECT a
            FROM Attendance a
            JOIN FETCH a.assignment ass
            JOIN FETCH ass.plan p
            JOIN FETCH ass.staff s
            LEFT JOIN FETCH ass.shiftTemplate st
            WHERE a.id = :attendanceId
            """)
    Optional<Attendance> findDetailedById(@Param("attendanceId") Long attendanceId);

    @Query("""
            SELECT a
            FROM Attendance a
            JOIN FETCH a.assignment ass
            JOIN FETCH ass.plan p
            JOIN FETCH ass.staff s
            LEFT JOIN FETCH ass.shiftTemplate st
            WHERE a.businessDate BETWEEN :fromDate AND :toDate
            ORDER BY a.businessDate ASC, ass.shiftStart ASC, s.fullName ASC, s.username ASC
            """)
    List<Attendance> findDetailedBetweenDates(@Param("fromDate") LocalDate fromDate,
                                              @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT a
            FROM Attendance a
            JOIN FETCH a.assignment ass
            JOIN FETCH ass.plan p
            JOIN FETCH ass.staff s
            LEFT JOIN FETCH ass.shiftTemplate st
            WHERE a.staff.id = :staffId
              AND a.businessDate BETWEEN :fromDate AND :toDate
            ORDER BY a.businessDate ASC, ass.shiftStart ASC
            """)
    List<Attendance> findDetailedForStaffBetweenDates(@Param("staffId") Long staffId,
                                                      @Param("fromDate") LocalDate fromDate,
                                                      @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT a FROM Attendance a
            JOIN FETCH a.assignment ass
            JOIN FETCH ass.plan p
            JOIN FETCH ass.staff s
            LEFT JOIN FETCH ass.shiftTemplate st
            WHERE a.businessDate BETWEEN :fromDate AND :toDate
              AND ass.status IN (
                  com.astracine.backend.core.enums.ScheduleAssignmentStatus.PUBLISHED,
                  com.astracine.backend.core.enums.ScheduleAssignmentStatus.CONFIRMED,
                  com.astracine.backend.core.enums.ScheduleAssignmentStatus.ABSENT
              )
            ORDER BY a.businessDate ASC, ass.shiftStart ASC, s.fullName ASC
            """)
    List<Attendance> findPayrollAttendanceBetween(@Param("fromDate") LocalDate fromDate,
                                                  @Param("toDate") LocalDate toDate);
}
