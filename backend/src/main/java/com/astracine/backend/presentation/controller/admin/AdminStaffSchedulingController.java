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

    @PostMapping("/demands/generate-range")
    public ResponseEntity<StaffScheduleDTO.DemandRangeResponse> generateDemandRange(
            @Valid @RequestBody StaffScheduleDTO.GenerateDemandRangeRequest request
    ) {
        return ResponseEntity.ok(
                staffingDemandService.generateRange(
                        request.getStartDate(),
                        request.getEndDate(),
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

    @PostMapping("/plans/generate-range")
    public ResponseEntity<StaffScheduleDTO.PlanRangeResponse> generatePlanRange(
            @Valid @RequestBody StaffScheduleDTO.GeneratePlanRangeRequest request
    ) {
        return ResponseEntity.ok(staffScheduleService.generatePlanRange(request.getStartDate(), request.getEndDate()));
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


    @GetMapping("/staff-options")
    public ResponseEntity<List<StaffScheduleDTO.StaffOptionResponse>> getStaffOptions(
            @RequestParam LocalDate businessDate
    ) {
        return ResponseEntity.ok(staffScheduleService.getEligibleStaffOptions(businessDate));
    }

    @GetMapping("/shift-templates")
    public ResponseEntity<List<StaffScheduleDTO.ShiftTemplateResponse>> getShiftTemplates() {
        return ResponseEntity.ok(staffScheduleService.getActiveShiftTemplates());
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<StaffScheduleDTO.AssignmentResponse>> getAssignments(
            @RequestParam LocalDate businessDate
    ) {
        return ResponseEntity.ok(staffScheduleService.getAssignmentsByDate(businessDate));
    }

    @PostMapping("/assignments")
    public ResponseEntity<StaffScheduleDTO.AssignmentResponse> createManualAssignment(
            @Valid @RequestBody StaffScheduleDTO.ManualAssignmentUpsertRequest request
    ) {
        return ResponseEntity.ok(staffScheduleService.createManualAssignment(request));
    }

    @PutMapping("/assignments/{assignmentId}")
    public ResponseEntity<StaffScheduleDTO.AssignmentResponse> updateManualAssignment(
            @PathVariable Long assignmentId,
            @Valid @RequestBody StaffScheduleDTO.ManualAssignmentUpsertRequest request
    ) {
        return ResponseEntity.ok(staffScheduleService.updateManualAssignment(assignmentId, request));
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> deleteManualAssignment(
            @PathVariable Long assignmentId
    ) {
        staffScheduleService.deleteManualAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments/{assignmentId}/explanation")
    public ResponseEntity<StaffScheduleDTO.AssignmentExplanationResponse> getAssignmentExplanation(
            @PathVariable Long assignmentId
    ) {
        return ResponseEntity.ok(staffScheduleService.getExplanation(assignmentId));
    }
}
