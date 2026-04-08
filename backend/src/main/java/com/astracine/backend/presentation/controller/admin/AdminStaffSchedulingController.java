package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.StaffScheduleService;
import com.astracine.backend.core.service.StaffingDemandService;
import com.astracine.backend.presentation.dto.staffschedule.StaffScheduleDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/staff-scheduling")
@RequiredArgsConstructor
public class AdminStaffSchedulingController {

    private final StaffingDemandService staffingDemandService;
    private final StaffScheduleService staffScheduleService;

    @PostMapping("/demands/generate")
    public ResponseEntity<List<StaffScheduleDTO.DemandWindowResponse>> generateDemand(
            @Valid @RequestBody StaffScheduleDTO.GenerateDemandRequest request
    ) {
        return ResponseEntity.ok(
                staffingDemandService.generate(
                        request.getBusinessDate(),
                        request.getWindowMinutes(),
                        Boolean.TRUE.equals(request.getOverwrite())
                )
        );
    }

    @GetMapping("/demands")
    public ResponseEntity<List<StaffScheduleDTO.DemandWindowResponse>> getDemandByDate(
            @RequestParam LocalDate businessDate
    ) {
        return ResponseEntity.ok(staffingDemandService.getByDate(businessDate));
    }

    @PostMapping("/plans/generate")
    public ResponseEntity<StaffScheduleDTO.PlanResponse> generatePlan(
            @Valid @RequestBody StaffScheduleDTO.GeneratePlanRequest request
    ) {
        return ResponseEntity.ok(staffScheduleService.generatePlan(request.getBusinessDate()));
    }

    @GetMapping("/plans")
    public ResponseEntity<List<StaffScheduleDTO.PlanResponse>> getPlans(
            @RequestParam LocalDate businessDate
    ) {
        return ResponseEntity.ok(staffScheduleService.getPlans(businessDate));
    }

    @PostMapping("/plans/{planId}/publish")
    public ResponseEntity<StaffScheduleDTO.PlanResponse> publishPlan(
            @PathVariable Long planId
    ) {
        return ResponseEntity.ok(staffScheduleService.publishPlan(planId));
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<StaffScheduleDTO.AssignmentResponse>> getAssignments(
            @RequestParam LocalDate businessDate
    ) {
        return ResponseEntity.ok(staffScheduleService.getAssignmentsByDate(businessDate));
    }

    @GetMapping("/assignments/{assignmentId}/explanation")
    public ResponseEntity<StaffScheduleDTO.AssignmentExplanationResponse> getAssignmentExplanation(
            @PathVariable Long assignmentId
    ) {
        return ResponseEntity.ok(staffScheduleService.getExplanation(assignmentId));
    }
}