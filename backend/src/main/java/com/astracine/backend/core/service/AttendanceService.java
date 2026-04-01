package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Attendance;
import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.entity.ShiftTemplate;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.enums.AttendanceStatus;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.repository.AttendanceRepository;
import com.astracine.backend.core.repository.ScheduleAssignmentRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.attendance.AttendanceDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceService {

    private static final long EARLY_CHECK_IN_MINUTES = 15;
    private static final long LATE_CHECK_IN_LIMIT_MINUTES = 120;

    private final AttendanceRepository attendanceRepository;
    private final ScheduleAssignmentRepository scheduleAssignmentRepository;
    private final UserRepository userRepository;

    public AttendanceDTO.AttendanceItemResponse checkIn(Long assignmentId) {
        User currentUser = getCurrentUser();
        ScheduleAssignment assignment = getAssignmentForCurrentStaff(assignmentId, currentUser.getId());
        validateAssignmentCheckInEligibility(assignment);

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(assignment.getShiftStart().minusMinutes(EARLY_CHECK_IN_MINUTES))) {
            throw new RuntimeException("Chưa đến thời gian check-in cho ca này");
        }
        if (now.isAfter(assignment.getShiftStart().plusMinutes(LATE_CHECK_IN_LIMIT_MINUTES))) {
            throw new RuntimeException("Đã quá thời gian check-in cho ca này, vui lòng liên hệ admin");
        }

        Attendance attendance = attendanceRepository.findWithAssignmentByAssignmentId(assignmentId)
                .orElseGet(() -> createPendingAttendance(assignment));

        if (attendance.getCheckInTime() != null) {
            throw new RuntimeException("Ca này đã được check-in trước đó");
        }
        if (attendance.getStatus() == AttendanceStatus.ABSENT) {
            throw new RuntimeException("Ca này đã bị đánh dấu vắng mặt");
        }

        attendance.setCheckInTime(now);
        attendance.setLateMinutes((int) Math.max(0, Duration.between(assignment.getShiftStart(), now).toMinutes()));
        attendance.setStatus(AttendanceStatus.CHECKED_IN);
        attendance.setNote(trimToNull(attendance.getNote()));

        Attendance saved = attendanceRepository.save(attendance);
        return mapItem(assignment, saved, currentUser.getId());
    }

    public AttendanceDTO.AttendanceItemResponse checkOut(Long assignmentId) {
        User currentUser = getCurrentUser();
        ScheduleAssignment assignment = getAssignmentForCurrentStaff(assignmentId, currentUser.getId());
        Attendance attendance = attendanceRepository.findWithAssignmentByAssignmentId(assignmentId)
                .orElseThrow(() -> new RuntimeException("Ca này chưa được check-in"));

        if (attendance.getStatus() == AttendanceStatus.ABSENT) {
            throw new RuntimeException("Ca này đã bị đánh dấu vắng mặt");
        }
        if (attendance.getCheckInTime() == null) {
            throw new RuntimeException("Ca này chưa được check-in");
        }
        if (attendance.getCheckOutTime() != null) {
            throw new RuntimeException("Ca này đã được check-out trước đó");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(attendance.getCheckInTime())) {
            throw new RuntimeException("Thời gian check-out không hợp lệ");
        }

        attendance.setCheckOutTime(now);
        attendance.setWorkedMinutes(calculateWorkedMinutes(assignment, attendance.getCheckInTime(), now));
        attendance.setEarlyLeaveMinutes((int) Math.max(0, Duration.between(now, assignment.getShiftEnd()).toMinutes()));
        attendance.setStatus(AttendanceStatus.COMPLETED);
        Attendance saved = attendanceRepository.save(attendance);

        return mapItem(assignment, saved, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public AttendanceDTO.StaffAttendanceResponse getMyAttendance(LocalDate fromDate, LocalDate toDate) {
        User currentUser = getCurrentUser();
        List<ScheduleAssignment> assignments = scheduleAssignmentRepository.findForStaffBetweenDetailed(
                currentUser.getId(),
                fromDate.atStartOfDay(),
                toDate.plusDays(1).atStartOfDay());

        Map<Long, Attendance> attendanceMap = attendanceRepository.findDetailedForStaffBetweenDates(currentUser.getId(), fromDate, toDate)
                .stream()
                .collect(Collectors.toMap(a -> a.getAssignment().getId(), Function.identity()));

        List<AttendanceDTO.AttendanceItemResponse> items = assignments.stream()
                .map(assignment -> mapItem(assignment, attendanceMap.get(assignment.getId()), currentUser.getId()))
                .toList();

        return new AttendanceDTO.StaffAttendanceResponse(fromDate, toDate, items);
    }

    @Transactional(readOnly = true)
    public AttendanceDTO.AdminAttendanceDayResponse getAttendanceByDate(LocalDate businessDate) {
        List<ScheduleAssignment> assignments = scheduleAssignmentRepository.findByBusinessDateDetailed(businessDate);
        Map<Long, Attendance> attendanceMap = attendanceRepository.findDetailedBetweenDates(businessDate, businessDate)
                .stream()
                .collect(Collectors.toMap(a -> a.getAssignment().getId(), Function.identity()));

        List<AttendanceDTO.AttendanceItemResponse> items = assignments.stream()
                .map(assignment -> mapItem(assignment, attendanceMap.get(assignment.getId()), null))
                .sorted(Comparator.comparing(AttendanceDTO.AttendanceItemResponse::getScheduledStart)
                        .thenComparing(AttendanceDTO.AttendanceItemResponse::getStaffName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        int checkedInCount = (int) items.stream().filter(i -> i.getAttendanceStatus() == AttendanceStatus.CHECKED_IN).count();
        int completedCount = (int) items.stream().filter(i -> i.getAttendanceStatus() == AttendanceStatus.COMPLETED || i.getAttendanceStatus() == AttendanceStatus.ADJUSTED).count();
        int absentCount = (int) items.stream().filter(i -> i.getAttendanceStatus() == AttendanceStatus.ABSENT).count();
        int pendingCount = (int) items.stream().filter(i -> i.getAttendanceStatus() == AttendanceStatus.PENDING || i.getAttendanceStatus() == null).count();

        return new AttendanceDTO.AdminAttendanceDayResponse(
                businessDate,
                items.size(),
                checkedInCount,
                completedCount,
                absentCount,
                pendingCount,
                items
        );
    }

    public AttendanceDTO.AttendanceItemResponse adjustAttendance(Long attendanceId,
                                                                 AttendanceDTO.AdjustAttendanceRequest request) {
        Attendance attendance = attendanceRepository.findDetailedById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy attendance"));

        if (request.getCheckOutTime().isBefore(request.getCheckInTime())) {
            throw new RuntimeException("checkOutTime phải sau checkInTime");
        }

        ScheduleAssignment assignment = attendance.getAssignment();
        attendance.setCheckInTime(request.getCheckInTime());
        attendance.setCheckOutTime(request.getCheckOutTime());
        attendance.setWorkedMinutes(calculateWorkedMinutes(assignment, request.getCheckInTime(), request.getCheckOutTime()));
        attendance.setLateMinutes((int) Math.max(0, Duration.between(assignment.getShiftStart(), request.getCheckInTime()).toMinutes()));
        attendance.setEarlyLeaveMinutes((int) Math.max(0, Duration.between(request.getCheckOutTime(), assignment.getShiftEnd()).toMinutes()));
        attendance.setStatus(AttendanceStatus.ADJUSTED);
        attendance.setNote(trimToNull(request.getNote()));
        attendance.setApprovedBy(getCurrentUser().getId());
        attendance.setApprovedAt(LocalDateTime.now());

        Attendance saved = attendanceRepository.save(attendance);
        return mapItem(assignment, saved, null);
    }

    public AttendanceDTO.AttendanceItemResponse markAbsent(Long assignmentId, AttendanceDTO.MarkAbsentRequest request) {
        ScheduleAssignment assignment = scheduleAssignmentRepository.findDetailedById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy assignment"));

        validateAssignmentManageable(assignment);

        Attendance attendance = attendanceRepository.findWithAssignmentByAssignmentId(assignmentId)
                .orElseGet(() -> createPendingAttendance(assignment));

        attendance.setCheckInTime(null);
        attendance.setCheckOutTime(null);
        attendance.setWorkedMinutes(0);
        attendance.setLateMinutes(0);
        attendance.setEarlyLeaveMinutes(0);
        attendance.setStatus(AttendanceStatus.ABSENT);
        attendance.setNote(trimToNull(request.getNote()));
        attendance.setApprovedBy(getCurrentUser().getId());
        attendance.setApprovedAt(LocalDateTime.now());

        Attendance saved = attendanceRepository.save(attendance);
        return mapItem(assignment, saved, null);
    }

    private ScheduleAssignment getAssignmentForCurrentStaff(Long assignmentId, Long currentStaffId) {
        ScheduleAssignment assignment = scheduleAssignmentRepository.findDetailedById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy assignment"));
        if (!Objects.equals(assignment.getStaff().getId(), currentStaffId)) {
            throw new RuntimeException("Bạn không thể thao tác attendance của người khác");
        }
        return assignment;
    }

    private void validateAssignmentCheckInEligibility(ScheduleAssignment assignment) {
        validateAssignmentManageable(assignment);
        if (assignment.getStatus() != ScheduleAssignmentStatus.PUBLISHED
                && assignment.getStatus() != ScheduleAssignmentStatus.CONFIRMED) {
            throw new RuntimeException("Chỉ được chấm công cho ca đã publish hoặc đã confirm");
        }
    }

    private void validateAssignmentManageable(ScheduleAssignment assignment) {
        if (assignment.getPlan() == null || assignment.getPlan().getStatus() == null) {
            throw new RuntimeException("Assignment không hợp lệ");
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
        return attendance;
    }

    private int calculateWorkedMinutes(ScheduleAssignment assignment,
                                       LocalDateTime checkInTime,
                                       LocalDateTime checkOutTime) {
        LocalDateTime effectiveStart = checkInTime.isAfter(assignment.getShiftStart()) ? checkInTime : assignment.getShiftStart();
        LocalDateTime effectiveEnd = checkOutTime.isBefore(assignment.getShiftEnd()) ? checkOutTime : assignment.getShiftEnd();
        long rawMinutes = Math.max(0, Duration.between(effectiveStart, effectiveEnd).toMinutes());
        int breakMinutes = Optional.ofNullable(assignment.getShiftTemplate())
                .map(ShiftTemplate::getBreakMinutes)
                .orElse(0);
        long worked = Math.max(0, rawMinutes - breakMinutes);
        return (int) worked;
    }

    private AttendanceDTO.AttendanceItemResponse mapItem(ScheduleAssignment assignment,
                                                         Attendance attendance,
                                                         Long currentStaffId) {
        ShiftTemplate template = assignment.getShiftTemplate();
        AttendanceStatus status = attendance == null ? AttendanceStatus.PENDING : attendance.getStatus();
        LocalDateTime now = LocalDateTime.now();
        boolean isOwner = currentStaffId != null && Objects.equals(currentStaffId, assignment.getStaff().getId());
        boolean canCheckIn = isOwner
                && (assignment.getStatus() == ScheduleAssignmentStatus.PUBLISHED || assignment.getStatus() == ScheduleAssignmentStatus.CONFIRMED)
                && (attendance == null || attendance.getCheckInTime() == null)
                && !now.isBefore(assignment.getShiftStart().minusMinutes(EARLY_CHECK_IN_MINUTES))
                && !now.isAfter(assignment.getShiftStart().plusMinutes(LATE_CHECK_IN_LIMIT_MINUTES));
        boolean canCheckOut = isOwner
                && attendance != null
                && attendance.getCheckInTime() != null
                && attendance.getCheckOutTime() == null
                && attendance.getStatus() != AttendanceStatus.ABSENT;

        return new AttendanceDTO.AttendanceItemResponse(
                attendance == null ? null : attendance.getId(),
                assignment.getId(),
                assignment.getPlan().getId(),
                assignment.getStaff().getId(),
                resolveStaffName(assignment.getStaff()),
                assignment.getStaff().getUsername(),
                assignment.getPlan().getBusinessDate(),
                assignment.getAssignedPosition(),
                template == null ? null : template.getCode(),
                template == null ? null : template.getName(),
                assignment.getShiftStart(),
                assignment.getShiftEnd(),
                attendance == null ? null : attendance.getCheckInTime(),
                attendance == null ? null : attendance.getCheckOutTime(),
                attendance == null ? 0 : attendance.getWorkedMinutes(),
                attendance == null ? 0 : attendance.getLateMinutes(),
                attendance == null ? 0 : attendance.getEarlyLeaveMinutes(),
                status,
                assignment.getStatus(),
                attendance == null ? null : attendance.getNote(),
                canCheckIn,
                canCheckOut
        );
    }

    private User getCurrentUser() {
        String username = getCurrentUsername();
        if (username == null || username.isBlank()) {
            throw new RuntimeException("Không xác định được người dùng hiện tại");
        }
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            return null;
        }
        return userDetails.getUsername();
    }

    private String resolveStaffName(User user) {
        return user.getFullName() == null || user.getFullName().isBlank() ? user.getUsername() : user.getFullName();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
