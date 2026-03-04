package com.astracine.backend.infrastructure.config;

import java.io.IOException;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class CustomAuthEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException)
            throws IOException {

        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        String message;

        // 🔥 BẮT NGUYÊN NHÂN GỐC
        Throwable cause = authException.getCause();

        if (cause instanceof LockedException) {
            message = cause.getMessage();
        }
        else if (authException instanceof LockedException) {
            message = authException.getMessage();
        }
        else if (authException instanceof BadCredentialsException) {
            message = "Sai tài khoản hoặc mật khẩu";
        }
        else {
            message = "Sai tài khoản hoặc mật khẩu";
        }

        response.getWriter().write("""
            {
                "status": 401,
                "message": "%s"
            }
            """.formatted(message));
    }
}