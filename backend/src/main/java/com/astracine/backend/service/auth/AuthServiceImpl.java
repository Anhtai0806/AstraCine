package com.astracine.backend.service.auth;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.astracine.backend.dto.auth.AuthResponse;
import com.astracine.backend.dto.auth.LoginRequest;
import com.astracine.backend.dto.auth.RegisterRequest;
import com.astracine.backend.entity.Role;
import com.astracine.backend.entity.User;
import com.astracine.backend.repository.RoleRepository;
import com.astracine.backend.repository.UserRepository;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= LOGIN =================
    @Override
    public AuthResponse login(LoginRequest request) {

        User user = userRepository
                .findByUsernameOrEmailOrPhone(
                        request.getIdentifier(),
                        request.getIdentifier(),
                        request.getIdentifier()
                )
                .orElseThrow(() ->
                        new RuntimeException("Invalid username/email/phone or password")
                );

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword()
        )) {
            throw new RuntimeException("Invalid username/email/phone or password");
        }

        return buildAuthResponse(user);
    }

    // ================= REGISTER =================
    @Override
    public AuthResponse register(RegisterRequest request) {

        // ===== Check tồn tại =====
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone already exists");
        }

        Role customerRole = roleRepository
                .findByName("CUSTOMER")
                .orElseThrow(() -> new RuntimeException("Role CUSTOMER not found"));

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setFullName(request.getFullName());

        // ===== HASH PASSWORD =====
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.getRoles().add(customerRole);

        userRepository.save(user);

        // Auto login sau register
        return buildAuthResponse(user);
    }

    // ================= BUILD RESPONSE =================
    private AuthResponse buildAuthResponse(User user) {

        Set<String> roles = user.getRoles()
                .stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        return new AuthResponse(
                null, // JWT sẽ làm sau
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                roles
        );
    }
}
