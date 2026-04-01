package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.AttendanceService;
import com.astracine.backend.presentation.dto.attendance.AttendanceDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/attendance")
@RequiredArgsConstructor
public class AdminAttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<AttendanceDTO.AdminAttendanceDayResponse> getAttendanceByDate(
            @RequestParam LocalDate businessDate) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDate(businessDate));
    }

    @PutMapping("/{attendanceId}/adjust")
    public ResponseEntity<AttendanceDTO.AttendanceItemResponse> adjustAttendance(
            @PathVariable Long attendanceId,
            @Valid @RequestBody AttendanceDTO.AdjustAttendanceRequest request) {
        return ResponseEntity.ok(attendanceService.adjustAttendance(attendanceId, request));
    }

    @PutMapping("/assignments/{assignmentId}/mark-absent")
    public ResponseEntity<AttendanceDTO.AttendanceItemResponse> markAbsent(
            @PathVariable Long assignmentId,
            @Valid @RequestBody AttendanceDTO.MarkAbsentRequest request) {
        return ResponseEntity.ok(attendanceService.markAbsent(assignmentId, request));
    }
}
