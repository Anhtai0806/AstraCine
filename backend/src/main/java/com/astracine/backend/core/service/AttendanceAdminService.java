package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.repository.ScheduleAssignmentRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.staffschedule.StaffAttendanceDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceAdminService {

    private final ScheduleAssignmentRepository scheduleAssignmentRepository;
    private final AttendanceDisciplineService attendanceDisciplineService;
    private final UserRepository userRepository;

    public StaffAttendanceDTO.StaffAttendanceStatusResponse markAbsent(Long assignmentId, String note) {
        ScheduleAssignment assignment = scheduleAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy assignment"));

        assignment.setStatus(ScheduleAssignmentStatus.ABSENT);
        scheduleAssignmentRepository.save(assignment);

        attendanceDisciplineService.markAssignmentAbsent(
                assignment,
                note != null && !note.isBlank() ? note : "Admin đánh dấu vắng mặt"
        );

        User staff = assignment.getStaff();
        long absentCount30d = attendanceDisciplineService.countAbsent30Days(staff.getId());

        return new StaffAttendanceDTO.StaffAttendanceStatusResponse(
                staff.getId(),
                staff.getFullName(),
                staff.getUsername(),
                staff.getAttendanceDisciplineStatus(),
                absentCount30d
        );
    }

    @Transactional(readOnly = true)
    public StaffAttendanceDTO.StaffAttendanceStatusResponse getStatus(Long staffUserId) {
        User staff = userRepository.findById(staffUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy staff"));

        long absentCount30d = attendanceDisciplineService.countAbsent30Days(staff.getId());

        return new StaffAttendanceDTO.StaffAttendanceStatusResponse(
                staff.getId(),
                staff.getFullName(),
                staff.getUsername(),
                staff.getAttendanceDisciplineStatus(),
                absentCount30d
        );
    }
}