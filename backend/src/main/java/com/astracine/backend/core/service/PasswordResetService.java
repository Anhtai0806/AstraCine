package com.astracine.backend.core.service;

public interface PasswordResetService {

    /**
     * Khởi tạo quy trình đặt lại mật khẩu.
     * Tìm user theo email, tạo token, lưu DB, gửi email.
     *
     * @param email email của người dùng muốn đặt lại mật khẩu
     */
    void initiatePasswordReset(String email);

    /**
     * Xác nhận đặt lại mật khẩu bằng token.
     *
     * @param token       token nhận được qua email
     * @param newPassword mật khẩu mới
     */
    void resetPassword(String token, String newPassword);
}
