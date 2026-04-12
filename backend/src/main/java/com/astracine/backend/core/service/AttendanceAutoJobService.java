package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Attendance;
import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.enums.AttendanceStatus;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.repository.AttendanceRepository;
import com.astracine.backend.core.repository.ScheduleAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceAutoJobService {

    private static final int LATE_CHECK_IN_LIMIT_MINUTES = 15;

    private final ScheduleAssignmentRepository scheduleAssignmentRepository;
    private final AttendanceRepository attendanceRepository;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void autoMarkAbsentForLateCheckIn() {
        LocalDateTime latestDeadline = LocalDateTime.now().minusMinutes(LATE_CHECK_IN_LIMIT_MINUTES);
        List<ScheduleAssignment> assignments =
                scheduleAssignmentRepository.findAssignmentsEligibleForAutoAbsent(latestDeadline);

        for (ScheduleAssignment assignment : assignments) {
            Attendance attendance = attendanceRepository
                    .findWithAssignmentByAssignmentId(assignment.getId())
                    .orElse(null);

            boolean alreadyCheckedIn = attendance != null && attendance.getCheckInTime() != null;
            boolean alreadyAbsent = attendance != null && attendance.getStatus() == AttendanceStatus.ABSENT;

            if (alreadyCheckedIn || alreadyAbsent) {
                continue;
            }

            Attendance target = attendance != null ? attendance : createPendingAttendance(assignment);
            target.setStatus(AttendanceStatus.ABSENT);
            target.setWorkedMinutes(0);
            target.setLateMinutes(0);
            target.setEarlyLeaveMinutes(0);
            target.setAutoMarkedAbsent(true);
            target.setNote("Tự động đánh vắng do quá 15 phút chưa check-in");
            target.setApprovedAt(LocalDateTime.now());
            attendanceRepository.save(target);

            assignment.setStatus(ScheduleAssignmentStatus.ABSENT);
            scheduleAssignmentRepository.save(assignment);
        }
    }

    private Attendance createPendingAttendance(ScheduleAssignment assignment) {
        Attendance attendance = new Attendance();
        attendance.setAssignment(assignment);
        attendance.setStaff(assignment.getStaff());
        attendance.setBusinessDate(assignment.getPlan().getBusinessDate());
        attendance.setScheduledStart(assignment.getShiftStart());
        attendance.setScheduledEnd(assignment.getShiftEnd());
        attendance.setStatus(AttendanceStatus.PENDING);
        attendance.setGpsVerified(false);
        attendance.setAutoMarkedAbsent(false);
        return attendance;
    }
}