package com.astracine.backend.core.entity;

import com.astracine.backend.core.enums.SchedulePlanStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedule_plans", indexes = {
        @Index(name = "idx_schedule_plans_business_date", columnList = "business_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchedulePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SchedulePlanStatus status = SchedulePlanStatus.DRAFT;

    @Column(name = "window_minutes", nullable = false)
    private Integer windowMinutes = 30;

    @Column(name = "generated_by")
    private Long generatedBy;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(length = 255)
    private String note;

    @PrePersist
    protected void onCreate() {
        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = SchedulePlanStatus.DRAFT;
        }
        if (windowMinutes == null) {
            windowMinutes = 30;
        }
    }
}
