package com.astracine.backend.presentation.dto.auth;

public class ForgotPasswordRequest {

    private String email;

    public ForgotPasswordRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
