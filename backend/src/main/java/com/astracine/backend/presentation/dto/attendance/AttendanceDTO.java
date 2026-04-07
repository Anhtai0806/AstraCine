package com.astracine.backend.presentation.dto.attendance;

import com.astracine.backend.core.enums.AttendanceStatus;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AttendanceDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceItemResponse {
        private Long attendanceId;
        private Long assignmentId;
        private Long planId;
        private Long staffId;
        private String staffName;
        private String staffUsername;
        private LocalDate businessDate;
        private String assignedPosition;
        private String shiftCode;
        private String shiftName;
        private LocalDateTime scheduledStart;
        private LocalDateTime scheduledEnd;
        private LocalDateTime checkInTime;
        private LocalDateTime checkOutTime;
        private Integer workedMinutes;
        private Integer lateMinutes;
        private Integer earlyLeaveMinutes;
        private AttendanceStatus attendanceStatus;
        private ScheduleAssignmentStatus assignmentStatus;
        private String note;
        private Boolean gpsVerified;
        private Double checkInDistanceMeters;
        private Boolean autoMarkedAbsent;
        private Boolean canCheckIn;
        private Boolean canCheckOut;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffAttendanceResponse {
        private LocalDate fromDate;
        private LocalDate toDate;
        private List<AttendanceItemResponse> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminAttendanceDayResponse {
        private LocalDate businessDate;
        private Integer totalAssignments;
        private Integer checkedInCount;
        private Integer completedCount;
        private Integer absentCount;
        private Integer pendingCount;
        private List<AttendanceItemResponse> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckInRequest {
        @NotNull
        private Long assignmentId;

        @NotNull
        private Double latitude;

        @NotNull
        private Double longitude;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckOutRequest {
        @NotNull
        private Long assignmentId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdjustAttendanceRequest {
        @NotNull
        private LocalDateTime checkInTime;

        @NotNull
        private LocalDateTime checkOutTime;

        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkAbsentRequest {
        @NotBlank
        private String note;
    }
}
