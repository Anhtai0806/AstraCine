package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.StaffAttendanceViolation;
import com.astracine.backend.core.enums.AttendanceViolationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StaffAttendanceViolationRepository extends JpaRepository<StaffAttendanceViolation, Long> {

    long countByStaffUserIdAndViolationTypeAndViolationDateBetween(
            Long staffUserId,
            AttendanceViolationType violationType,
            LocalDateTime from,
            LocalDateTime to
    );

    List<StaffAttendanceViolation> findByStaffUserIdOrderByViolationDateDesc(Long staffUserId);
}