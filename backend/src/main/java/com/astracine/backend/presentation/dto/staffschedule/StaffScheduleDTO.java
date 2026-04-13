package com.astracine.backend.presentation.dto.staffschedule;

import com.astracine.backend.core.enums.AssignmentSource;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.enums.SchedulePlanStatus;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class StaffScheduleDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateDemandRequest {
        @NotNull
        @FutureOrPresent
        private LocalDate businessDate;

        private Integer windowMinutes = 30;

        private Boolean overwrite = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GenerateDemandRangeRequest {
        @NotNull
        @FutureOrPresent
        private LocalDate startDate;

        @NotNull
        @FutureOrPresent
        private LocalDate endDate;

        private Integer windowMinutes = 30;

        private Boolean overwrite = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandWindowResponse {
        private Long id;
        private LocalDate businessDate;
        private LocalDateTime windowStart;
        private LocalDateTime windowEnd;
        private Integer counterRequired;
        private Integer checkinRequired;
        private Integer concessionRequired;
        private Integer multiRequired;
        private String shiftCode;
        private String shiftName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneratePlanRequest {
        @NotNull
        @FutureOrPresent
        private LocalDate businessDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneratePlanRangeRequest {
        @NotNull
        @FutureOrPresent
        private LocalDate startDate;

        @NotNull
        @FutureOrPresent
        private LocalDate endDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RangeIssueResponse {
        private LocalDate businessDate;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DemandRangeResponse {
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer totalDaysRequested;
        private Integer successDays;
        private Integer failedDays;
        private Integer totalDemandWindows;
        private List<DemandWindowResponse> demands;
        private List<RangeIssueResponse> issues;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanRangeResponse {
        private LocalDate startDate;
        private LocalDate endDate;
        private Integer totalDaysRequested;
        private Integer successDays;
        private Integer failedDays;
        private Integer totalAssignments;
        private List<PlanResponse> plans;
        private List<RangeIssueResponse> issues;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanResponse {
        private Long id;
        private LocalDate businessDate;
        private SchedulePlanStatus status;
        private Integer windowMinutes;
        private Long generatedBy;
        private LocalDateTime generatedAt;
        private String note;
        private Integer assignmentCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentResponse {
        private Long id;
        private Long planId;
        private Long staffId;
        private String staffName;
        private String staffUsername;
        private String assignedPosition;
        private String shiftCode;
        private String shiftName;
        private LocalDateTime shiftStart;
        private LocalDateTime shiftEnd;
        private ScheduleAssignmentStatus status;
        private AssignmentSource source;
        private String explanation;
        private LocalDateTime respondedAt;
        private String responseNote;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffOptionResponse {
        private Long id;
        private String fullName;
        private String username;
        private String staffPosition;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ManualAssignmentUpsertRequest {
        @NotNull
        private Long planId;

        @NotNull
        private Long staffId;

        @NotNull
        private Long shiftTemplateId;

        @NotBlank
        private String assignedPosition;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignmentExplanationResponse {
        private Long assignmentId;
        private String explanation;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmAssignmentRequest {
        @NotNull
        private Long assignmentId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RejectAssignmentRequest {
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShiftTemplateResponse {
        private Long id;
        private String code;
        private String name;
        private LocalTime startTime;
        private LocalTime endTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyScheduleResponse {
        private LocalDate fromDate;
        private LocalDate toDate;
        private List<AssignmentResponse> assignments;
    }
}
