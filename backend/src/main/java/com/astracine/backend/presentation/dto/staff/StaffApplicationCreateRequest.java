package com.astracine.backend.presentation.dto.staff;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StaffApplicationCreateRequest {

    @NotBlank(message = "Bạn cần điền tên đăng nhập")
    private String username;

    @NotBlank(message = "Bạn cần điền mật khẩu")
    @Size(min = 8, message = "Mật khẩu phải có ít nhất 8 ký tự")
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*[@$!%*?&]).+$",
            message = "Mật khẩu phải chứa ít nhất một chữ hoa và một ký tự đặc biệt"
    )
    private String password;

    @NotBlank(message = "Bạn cần xác nhận mật khẩu")
    private String confirmPassword;

    @NotBlank(message = "Bạn cần điền họ và tên")
    private String fullName;

    @NotBlank(message = "Bạn cần điền email")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Bạn cần điền số điện thoại")
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    @NotBlank(message = "Bạn cần điền vị trí mong muốn")
    private String desiredPosition;
}