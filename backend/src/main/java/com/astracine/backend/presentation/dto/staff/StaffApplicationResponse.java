package com.astracine.backend.presentation.dto.staff;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffApplicationResponse {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String desiredPosition;
    private String status;
    private String adminNote;
    private Long createdUserId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}