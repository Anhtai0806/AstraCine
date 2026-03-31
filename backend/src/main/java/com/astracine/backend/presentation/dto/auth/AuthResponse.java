package com.astracine.backend.presentation.dto.auth;

import java.util.Set;

public class AuthResponse {

    private String token;

    private Long userId;
    private String username;
    private String fullName;
    private String email;
    private String phone;

    private Set<String> roles;

    private String staffPosition;

    public AuthResponse() {
    }

    public AuthResponse(
            String token,
            Long userId,
            String username,
            String fullName,
            String email,
            String phone,
            Set<String> roles,
            String staffPosition) {
        this.token = token;
        this.userId = userId;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.roles = roles;
        this.staffPosition = staffPosition;

    }


    public String getToken() {
        return token;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public Set<String> getRoles() {
        return roles;
    }


    public void setToken(String token) {
        this.token = token;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }

    public String getStaffPosition() {
        return staffPosition;
    }

    public void setStaffPosition(String staffPosition) {
        this.staffPosition = staffPosition;
    }
}
