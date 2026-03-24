package com.astracine.backend.core.service.auth;

import com.astracine.backend.presentation.dto.auth.AuthResponse;
import com.astracine.backend.presentation.dto.auth.LoginRequest;
import com.astracine.backend.presentation.dto.auth.RegisterRequest;

public interface AuthService {

    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);

    void initiatePasswordReset(String email);

    void resetPassword(String token, String newPassword);
}
