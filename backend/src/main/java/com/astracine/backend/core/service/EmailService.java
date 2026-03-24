package com.astracine.backend.core.service;

public interface EmailService {

    void sendPasswordResetEmail(String toEmail, String username, String resetLink);
}
