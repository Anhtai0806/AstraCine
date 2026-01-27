package com.astracine.backend.service.auth;

import com.astracine.backend.dto.auth.AuthResponse;
import com.astracine.backend.dto.auth.LoginRequest;
import com.astracine.backend.dto.auth.RegisterRequest;

public interface AuthService {

    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);
}
