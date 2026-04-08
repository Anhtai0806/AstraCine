package com.astracine.backend.presentation.dto.staffschedule;

import com.astracine.backend.core.enums.AttendanceDisciplineStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class StaffAttendanceDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffAttendanceStatusResponse {
        private Long staffUserId;
        private String staffName;
        private String staffUsername;
        private AttendanceDisciplineStatus attendanceDisciplineStatus;
        private long absentCount30d;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkAbsentRequest {
        private Long assignmentId;
        private String note;
    }
}