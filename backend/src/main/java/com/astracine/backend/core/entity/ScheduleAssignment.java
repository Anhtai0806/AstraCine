package com.astracine.backend.core.entity;

import com.astracine.backend.core.enums.AssignmentSource;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "schedule_assignments", indexes = {
        @Index(name = "idx_schedule_assignments_staff", columnList = "staff_id"),
        @Index(name = "idx_schedule_assignments_shift_start", columnList = "shift_start"),
        @Index(name = "idx_schedule_assignments_plan", columnList = "plan_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private SchedulePlan plan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_template_id")
    private ShiftTemplate shiftTemplate;

    @Column(name = "assigned_position", nullable = false, length = 30)
    private String assignedPosition;

    @Column(name = "shift_start", nullable = false)
    private LocalDateTime shiftStart;

    @Column(name = "shift_end", nullable = false)
    private LocalDateTime shiftEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScheduleAssignmentStatus status = ScheduleAssignmentStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AssignmentSource source = AssignmentSource.AUTO;

    @Column(name = "explanation", length = 1000)
    private String explanation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = ScheduleAssignmentStatus.DRAFT;
        }
        if (source == null) {
            source = AssignmentSource.AUTO;
        }
    }
}
