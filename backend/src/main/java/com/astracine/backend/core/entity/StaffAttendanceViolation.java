package com.astracine.backend.core.entity;

import com.astracine.backend.core.enums.AttendanceViolationType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "staff_attendance_violations")
@Getter
@Setter
public class StaffAttendanceViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_user_id", nullable = false)
    private Long staffUserId;

    @Column(name = "assignment_id")
    private Long assignmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "violation_type", nullable = false, length = 40)
    private AttendanceViolationType violationType;

    @Column(name = "violation_date", nullable = false)
    private LocalDateTime violationDate;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (violationDate == null) {
            violationDate = LocalDateTime.now();
        }
    }
}