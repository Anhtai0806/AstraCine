package com.astracine.backend.presentation.dto.profile;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank(message = "M\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i l\u00e0 b\u1eaft bu\u1ed9c")
    private String currentPassword;

    private String newPassword;

    private String confirmPassword;
}
