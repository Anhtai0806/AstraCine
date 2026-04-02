package com.astracine.backend.presentation.controller.staff;

import com.astracine.backend.core.service.StaffScheduleService;
import com.astracine.backend.presentation.dto.staffschedule.StaffScheduleDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/staff/schedule")
@RequiredArgsConstructor
public class StaffScheduleController {

    private final StaffScheduleService staffScheduleService;

    @GetMapping
    public ResponseEntity<StaffScheduleDTO.MyScheduleResponse> getMySchedule(
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(staffScheduleService.getMySchedule(fromDate, toDate));
    }

    @PostMapping("/{assignmentId}/confirm")
    public ResponseEntity<StaffScheduleDTO.AssignmentResponse> confirmAssignment(@PathVariable Long assignmentId) {
        return ResponseEntity.ok(staffScheduleService.confirmAssignment(assignmentId));
    }
}
