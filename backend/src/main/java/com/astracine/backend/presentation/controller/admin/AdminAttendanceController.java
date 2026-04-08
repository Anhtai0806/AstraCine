package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.AttendanceAdminService;
import com.astracine.backend.core.service.AttendanceService;
import com.astracine.backend.presentation.dto.attendance.AttendanceDTO;
import com.astracine.backend.presentation.dto.staffschedule.StaffAttendanceDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/attendance")
@RequiredArgsConstructor
public class AdminAttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceAdminService attendanceAdminService;

    @GetMapping
    public ResponseEntity<AttendanceDTO.AdminAttendanceDayResponse> getAttendanceByDate(
            @RequestParam LocalDate businessDate
    ) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDate(businessDate));
    }

    @PutMapping("/{attendanceId}/adjust")
    public ResponseEntity<AttendanceDTO.AttendanceItemResponse> adjustAttendance(
            @PathVariable Long attendanceId,
            @RequestBody AttendanceDTO.AdjustAttendanceRequest request
    ) {
        return ResponseEntity.ok(attendanceService.adjustAttendance(attendanceId, request));
    }

    @PutMapping("/assignments/{assignmentId}/mark-absent")
    public ResponseEntity<Map<String, Object>> markAbsent(
            @PathVariable Long assignmentId,
            @RequestBody AttendanceDTO.MarkAbsentRequest request
    ) {
        AttendanceDTO.AttendanceItemResponse attendance =
                attendanceService.markAbsent(assignmentId, request);

        StaffAttendanceDTO.StaffAttendanceStatusResponse discipline =
                attendanceAdminService.markAbsent(assignmentId, request.getNote());

        Map<String, Object> response = new HashMap<>();
        response.put("attendance", attendance);
        response.put("discipline", discipline);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/staff/{staffUserId}")
    public ResponseEntity<StaffAttendanceDTO.StaffAttendanceStatusResponse> getStaffAttendanceStatus(
            @PathVariable Long staffUserId
    ) {
        return ResponseEntity.ok(attendanceAdminService.getStatus(staffUserId));
    }
}