package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.PasswordResetToken;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.PasswordResetTokenRepository;
import com.astracine.backend.core.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetServiceImpl implements PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetServiceImpl(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    // ===== BƯỚC 1: Gửi email chứa link reset =====
    @Override
    @Transactional
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với email: " + email));

        // Xoá token cũ (nếu có) trước khi tạo mới
        tokenRepository.deleteByUser(user);

        // Tạo token mới, hiệu lực 15 phút
        String token = UUID.randomUUID().toString();
        LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(15);

        PasswordResetToken resetToken = new PasswordResetToken(token, user, expiryDate);
        tokenRepository.save(resetToken);

        // Gửi email
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), resetLink);
    }

    // ===== BƯỚC 2: Đặt lại mật khẩu với token =====
    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token không hợp lệ"));

        if (resetToken.isUsed()) {
            throw new RuntimeException("Token đã được sử dụng");
        }

        if (resetToken.isExpired()) {
            throw new RuntimeException("Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới");
        }

        // Cập nhật mật khẩu mới (BCrypt encode)
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setStaffTemporaryPassword(null);
        userRepository.save(user);

        // Đánh dấu token đã dùng (không xoá để có thể audit)
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }
}
