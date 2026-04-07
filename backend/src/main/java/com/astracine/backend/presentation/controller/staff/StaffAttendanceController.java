package com.astracine.backend.presentation.controller.staff;

import com.astracine.backend.core.service.AttendanceService;
import com.astracine.backend.presentation.dto.attendance.AttendanceDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/staff/attendance")
@RequiredArgsConstructor
public class StaffAttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    public ResponseEntity<AttendanceDTO.AttendanceItemResponse> checkIn(@Valid @RequestBody AttendanceDTO.CheckInRequest request) {
        return ResponseEntity.ok(attendanceService.checkIn(request.getAssignmentId(), request.getLatitude(), request.getLongitude()));
    }

    @PostMapping("/check-out")
    public ResponseEntity<AttendanceDTO.AttendanceItemResponse> checkOut(@Valid @RequestBody AttendanceDTO.CheckOutRequest request) {
        return ResponseEntity.ok(attendanceService.checkOut(request.getAssignmentId()));
    }

    @GetMapping("/my")
    public ResponseEntity<AttendanceDTO.StaffAttendanceResponse> getMyAttendance(@RequestParam LocalDate fromDate,
                                                                                 @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(attendanceService.getMyAttendance(fromDate, toDate));
    }
}
