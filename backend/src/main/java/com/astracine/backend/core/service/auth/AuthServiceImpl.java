package com.astracine.backend.core.service.auth;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.astracine.backend.core.entity.Role;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.RoleRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.core.service.PasswordResetService;
import com.astracine.backend.infrastructure.security.JwtTokenProvider;
import com.astracine.backend.presentation.dto.auth.AuthResponse;
import com.astracine.backend.presentation.dto.auth.LoginRequest;
import com.astracine.backend.presentation.dto.auth.RegisterRequest;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetService passwordResetService;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            PasswordResetService passwordResetService,
            AuthenticationManager authenticationManager,
            JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetService = passwordResetService;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    // ================= LOGIN =================
    @Override
    public AuthResponse login(LoginRequest request) {

        User user = userRepository
                .findByUsernameOrEmailOrPhone(
                        request.getIdentifier(),
                        request.getIdentifier(),
                        request.getIdentifier())
                .orElseThrow(() -> new RuntimeException("Sai username/email/SĐT hoặc mật khẩu"));

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {
            throw new RuntimeException("Sai username/email/SĐT hoặc mật khẩu");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        return buildAuthResponse(user, jwt);
    }

    // ================= REGISTER =================
    @Override
    public AuthResponse register(RegisterRequest request) {

        String normalizedUsername = request.getUsername().trim();
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedPhone = request.getPhone().trim();
        String normalizedFullName = request.getFullName().trim();

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Password confirmation does not match");
        }

        // ===== Check tồn tại =====
        if (userRepository.existsByUsername(normalizedUsername) ||
                userRepository.existsByEmail(normalizedUsername) ||
                userRepository.existsByPhone(normalizedUsername)) {
            throw new RuntimeException("Tên người dùng đã được sử dụng");
        }

        if (userRepository.existsByEmail(normalizedEmail) ||
                userRepository.existsByUsername(normalizedEmail) ||
                userRepository.existsByPhone(normalizedEmail)) {
            throw new RuntimeException("Email đã được sử dụng");
        }

        if (userRepository.existsByPhone(normalizedPhone) ||
                userRepository.existsByUsername(normalizedPhone) ||
                userRepository.existsByEmail(normalizedPhone)) {
            throw new RuntimeException("Số điện thoại đã được sử dụng");
        }

        Role customerRole = roleRepository
                .findByName("ROLE_CUSTOMER")
                .orElseThrow(() -> new RuntimeException("Role CUSTOMER not found"));

        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPhone(normalizedPhone);
        user.setFullName(normalizedFullName);
        user.setEnabled(true);
        user.setStatus("ACTIVE");

        // ===== HASH PASSWORD =====
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.getRoles().add(customerRole);

        userRepository.save(user);

        // Auto login sau register
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        return buildAuthResponse(user, jwt);
    }

    // ================= PASSWORD RESET =================
    @Override
    public void initiatePasswordReset(String email) {
        passwordResetService.initiatePasswordReset(email);
    }

    @Override
    public void resetPassword(String token, String newPassword) {
        passwordResetService.resetPassword(token, newPassword);
    }

    // ================= BUILD RESPONSE =================
    private AuthResponse buildAuthResponse(User user, String jwt) {

        Set<String> roles = user.getRoles()
                .stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        return new AuthResponse(
                jwt,
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roles,
                user.getStaffPosition());
    }
}
