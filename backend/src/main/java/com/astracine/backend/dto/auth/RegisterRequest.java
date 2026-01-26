package com.astracine.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "Bạn cần điền tên đăng nhập")
    private String username;

    @NotBlank(message = "Bạn cần điền mật khẩu")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[@$!%*?&]).+$",
        message = "Mật khẩu phải chứa ít nhất một chữ cái viết hoa và một ký tự đặc biệt"
    )
    private String password;

    @NotBlank(message = "Bạn cần xác nhận mật khẩu")
    private String confirmPassword;

    @NotBlank(message = "Bạn cần điền email")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Bạn cần điền số điện thoại")
    @Pattern(
        regexp = "^0\\d{9}$",
        message = "Số điện thoại không hợp lệ"
    )
    private String phone;

    @NotBlank(message = "Bạn cần điền họ và tên")
    private String fullName;

    public RegisterRequest() {}

    // ===== getters và setters =====
    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
    }
    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;
    }
    public String getConfirmPassword() {
        return confirmPassword;
    }
    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }
    public String getEmail() {
        return email;
    }
    public void setEmail(String email) {
        this.email = email;
    }
    public String getPhone() {
        return phone;
    }
    public void setPhone(String phone) {
        this.phone = phone;
    }
    public String getFullName() {
        return fullName;
    }
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }
    
}
