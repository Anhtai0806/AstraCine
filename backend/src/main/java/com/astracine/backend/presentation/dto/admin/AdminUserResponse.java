package com.astracine.backend.presentation.dto.admin;

import java.util.Set;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminUserResponse {

    private Long id;
    private String username;
    private String email;
    private String phone;
    private boolean enabled;
    private String lockReason;
    private Set<String> roles;
}