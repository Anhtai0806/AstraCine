package com.astracine.backend.core.service;

import com.astracine.backend.presentation.dto.profile.ChangePasswordRequest;
import com.astracine.backend.presentation.dto.profile.UpdateProfileRequest;
import com.astracine.backend.presentation.dto.profile.UserProfileResponse;

public interface UserService {

    UserProfileResponse getProfile(String username);

    UserProfileResponse updateProfile(String username, UpdateProfileRequest request);

    void changePassword(String username, ChangePasswordRequest request);
}
