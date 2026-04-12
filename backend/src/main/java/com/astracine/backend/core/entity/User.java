package com.astracine.backend.core.entity;

import com.astracine.backend.core.enums.EmploymentType;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import com.astracine.backend.core.enums.AttendanceDisciplineStatus;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(unique = true)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column(name = "full_name")
    private String fullName;

    @Column
    private String status = "ACTIVE";

    @Column(name = "enabled")
    private Boolean enabled = true;

    @Column(name = "lock_reason")
    private String lockReason;

    @Column(name = "desired_position")
    private String desiredPosition;

    @Column(name = "staff_application_status")
    private String staffApplicationStatus = "NONE";

    @Column(name = "staff_temporary_password", length = 120)
    private String staffTemporaryPassword;

    @Column(name = "staff_credentials_issued_at")
    private LocalDateTime staffCredentialsIssuedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    @Column(name = "staff_position", length = 30)
    private String staffPosition;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 20)
    private EmploymentType employmentType = EmploymentType.FULL_TIME;

    @Column(name = "seasonal_only", nullable = false)
    private Boolean seasonalOnly = false;

    @Column(name = "seasonal_start_date")
    private LocalDate seasonalStartDate;

    @Column(name = "seasonal_end_date")
    private LocalDate seasonalEndDate;

    @Column(name = "no_show_strike_count", nullable = false)
    private Integer noShowStrikeCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_discipline_status", length = 50)
    private AttendanceDisciplineStatus attendanceDisciplineStatus = AttendanceDisciplineStatus.NORMAL;

    public User() {
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (enabled == null) enabled = true;
        if (staffApplicationStatus == null || staffApplicationStatus.isBlank()) staffApplicationStatus = "NONE";
        if (employmentType == null) employmentType = EmploymentType.FULL_TIME;
        if (seasonalOnly == null) seasonalOnly = false;
        if (noShowStrikeCount == null) noShowStrikeCount = 0;
    }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getFullName() { return fullName; }
    public String getStatus() { return status; }
    public Boolean getEnabled() { return enabled; }
    public String getLockReason() { return lockReason; }
    public String getDesiredPosition() { return desiredPosition; }
    public String getStaffApplicationStatus() { return staffApplicationStatus; }
    public String getStaffTemporaryPassword() { return staffTemporaryPassword; }
    public LocalDateTime getStaffCredentialsIssuedAt() { return staffCredentialsIssuedAt; }
    public Set<Role> getRoles() { return roles; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getStaffPosition() { return staffPosition; }
    public EmploymentType getEmploymentType() { return employmentType; }
    public Boolean getSeasonalOnly() { return seasonalOnly; }
    public LocalDate getSeasonalStartDate() { return seasonalStartDate; }
    public LocalDate getSeasonalEndDate() { return seasonalEndDate; }
    public Integer getNoShowStrikeCount() { return noShowStrikeCount; }

    public void setId(Long id) { this.id = id; }
    public void setUsername(String username) { this.username = username; }
    public void setPassword(String password) { this.password = password; }
    public void setEmail(String email) { this.email = email; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public void setStatus(String status) { this.status = status; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public void setLockReason(String lockReason) { this.lockReason = lockReason; }
    public void setDesiredPosition(String desiredPosition) { this.desiredPosition = desiredPosition; }
    public void setStaffApplicationStatus(String staffApplicationStatus) { this.staffApplicationStatus = staffApplicationStatus; }
    public void setStaffTemporaryPassword(String staffTemporaryPassword) { this.staffTemporaryPassword = staffTemporaryPassword; }
    public void setStaffCredentialsIssuedAt(LocalDateTime staffCredentialsIssuedAt) { this.staffCredentialsIssuedAt = staffCredentialsIssuedAt; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setStaffPosition(String staffPosition) { this.staffPosition = staffPosition; }
    public void setEmploymentType(EmploymentType employmentType) { this.employmentType = employmentType; }
    public void setSeasonalOnly(Boolean seasonalOnly) { this.seasonalOnly = seasonalOnly; }
    public void setSeasonalStartDate(LocalDate seasonalStartDate) { this.seasonalStartDate = seasonalStartDate; }
    public void setSeasonalEndDate(LocalDate seasonalEndDate) { this.seasonalEndDate = seasonalEndDate; }
    public void setNoShowStrikeCount(Integer noShowStrikeCount) { this.noShowStrikeCount = noShowStrikeCount; }

    public AttendanceDisciplineStatus getAttendanceDisciplineStatus() {
        return attendanceDisciplineStatus;
    }

    public void setAttendanceDisciplineStatus(AttendanceDisciplineStatus attendanceDisciplineStatus) {
        this.attendanceDisciplineStatus = attendanceDisciplineStatus;
    }
}
