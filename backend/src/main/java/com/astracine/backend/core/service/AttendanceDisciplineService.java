package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.entity.StaffAttendanceViolation;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.enums.AttendanceDisciplineStatus;
import com.astracine.backend.core.enums.AttendanceViolationType;
import com.astracine.backend.core.repository.StaffAttendanceViolationRepository;
import com.astracine.backend.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceDisciplineService {

    private static final int LOOKBACK_DAYS = 30;

    private final StaffAttendanceViolationRepository violationRepository;
    private final UserRepository userRepository;

    public AttendanceDisciplineStatus recordAbsentAndUpdateStatus(
            Long staffUserId,
            Long assignmentId,
            String note
    ) {
        StaffAttendanceViolation violation = new StaffAttendanceViolation();
        violation.setStaffUserId(staffUserId);
        violation.setAssignmentId(assignmentId);
        violation.setViolationType(AttendanceViolationType.ABSENT);
        violation.setViolationDate(LocalDateTime.now());
        violation.setNote(note);

        violationRepository.save(violation);

        return recalculateDisciplineStatus(staffUserId);
    }

    public AttendanceDisciplineStatus recalculateDisciplineStatus(Long staffUserId) {
        User user = userRepository.findById(staffUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy staff"));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.minusDays(LOOKBACK_DAYS);

        long absentCount30d = violationRepository.countByStaffUserIdAndViolationTypeAndViolationDateBetween(
                staffUserId,
                AttendanceViolationType.ABSENT,
                from,
                now
        );

        AttendanceDisciplineStatus nextStatus = resolveStatus(absentCount30d);
        user.setAttendanceDisciplineStatus(nextStatus);
        userRepository.save(user);

        return nextStatus;
    }

    @Transactional(readOnly = true)
    public AttendanceDisciplineStatus getCurrentStatus(Long staffUserId) {
        return userRepository.findById(staffUserId)
                .map(User::getAttendanceDisciplineStatus)
                .orElse(AttendanceDisciplineStatus.NORMAL);
    }

    @Transactional(readOnly = true)
    public long countAbsent30Days(Long staffUserId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.minusDays(LOOKBACK_DAYS);

        return violationRepository.countByStaffUserIdAndViolationTypeAndViolationDateBetween(
                staffUserId,
                AttendanceViolationType.ABSENT,
                from,
                now
        );
    }

    public void markAssignmentAbsent(ScheduleAssignment assignment, String note) {
        if (assignment == null || assignment.getStaff() == null) {
            throw new RuntimeException("Assignment không hợp lệ để đánh dấu vắng");
        }
        recordAbsentAndUpdateStatus(assignment.getStaff().getId(), assignment.getId(), note);
    }

    private AttendanceDisciplineStatus resolveStatus(long absentCount30d) {
        if (absentCount30d >= 4) {
            return AttendanceDisciplineStatus.LOCKED_BY_ATTENDANCE_REVIEW;
        }
        if (absentCount30d >= 3) {
            return AttendanceDisciplineStatus.SUSPENDED_FROM_AUTO_ASSIGNMENT;
        }
        if (absentCount30d >= 2) {
            return AttendanceDisciplineStatus.ON_PROBATION;
        }
        if (absentCount30d >= 1) {
            return AttendanceDisciplineStatus.WARNING;
        }
        return AttendanceDisciplineStatus.NORMAL;
    }
}