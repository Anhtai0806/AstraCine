package com.astracine.backend.presentation.dto.staff;

import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PayrollDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollRateResponse {
        private String position;
        private BigDecimal hourlyRate;
        private BigDecimal perMinuteRate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollAssignmentLineResponse {
        private Long assignmentId;
        private LocalDate businessDate;
        private String assignedPosition;
        private String shiftCode;
        private String shiftName;
        private LocalDateTime shiftStart;
        private LocalDateTime shiftEnd;
        private ScheduleAssignmentStatus status;
        private Integer workingMinutes;
        private BigDecimal hourlyRate;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollStaffSummaryItem {
        private Long staffId;
        private String staffName;
        private String staffUsername;
        private String staffPosition;
        private Integer assignmentCount;
        private Integer totalMinutes;
        private BigDecimal totalHours;
        private BigDecimal grossAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollSummaryResponse {
        private LocalDate fromDate;
        private LocalDate toDate;
        private Integer totalAssignments;
        private Integer totalMinutes;
        private BigDecimal totalHours;
        private BigDecimal totalGrossAmount;
        private List<PayrollRateResponse> rates;
        private List<PayrollStaffSummaryItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayrollStaffDetailResponse {
        private LocalDate fromDate;
        private LocalDate toDate;
        private Long staffId;
        private String staffName;
        private String staffUsername;
        private String staffPosition;
        private Integer assignmentCount;
        private Integer totalMinutes;
        private BigDecimal totalHours;
        private BigDecimal grossAmount;
        private List<PayrollRateResponse> rates;
        private List<PayrollAssignmentLineResponse> assignments;
        private String note;
    }
}
