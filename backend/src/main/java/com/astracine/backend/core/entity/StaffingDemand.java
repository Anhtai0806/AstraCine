package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "staffing_demands", indexes = {
        @Index(name = "idx_staffing_demands_business_date", columnList = "business_date"),
        @Index(name = "idx_staffing_demands_window", columnList = "window_start, window_end")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StaffingDemand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Column(name = "window_start", nullable = false)
    private LocalDateTime windowStart;

    @Column(name = "window_end", nullable = false)
    private LocalDateTime windowEnd;

    @Column(name = "counter_required", nullable = false)
    private Integer counterRequired = 0;

    @Column(name = "checkin_required", nullable = false)
    private Integer checkinRequired = 0;

    @Column(name = "concession_required", nullable = false)
    private Integer concessionRequired = 0;

    @Column(name = "multi_required", nullable = false)
    private Integer multiRequired = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (counterRequired == null) counterRequired = 0;
        if (checkinRequired == null) checkinRequired = 0;
        if (concessionRequired == null) concessionRequired = 0;
        if (multiRequired == null) multiRequired = 0;
    }
}
