package com.astracine.backend.core.service.auth;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.astracine.backend.core.entity.Customer;
import com.astracine.backend.core.entity.Role;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.CustomerRepository;
import com.astracine.backend.core.repository.RoleRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.core.service.PasswordResetService;
import com.astracine.backend.presentation.dto.auth.AuthResponse;
import com.astracine.backend.presentation.dto.auth.LoginRequest;
import com.astracine.backend.presentation.dto.auth.RegisterRequest;

import jakarta.transaction.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomerRepository customerRepository;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetService passwordResetService;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            CustomerRepository customerRepository,
            AuthenticationManager authenticationManager,
            PasswordResetService passwordResetService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.customerRepository = customerRepository;
        this.authenticationManager = authenticationManager;
        this.passwordResetService = passwordResetService;
    }

    // ================= LOGIN =================
    // @Override
    // public AuthResponse login(LoginRequest request) {
    //     String identifier = request.getIdentifier();
    //     // 1️⃣ Tìm user trước (để lấy được lockReason)
    //     User user = userRepository
    //             .findByUsernameOrEmailOrPhone(
    //                     identifier,
    //                     identifier,
    //                     identifier)
    //             .orElseThrow(()
    //                     -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));
    //     // 3️⃣ Nếu không bị khóa mới authenticate
    //     authenticationManager.authenticate(
    //             new UsernamePasswordAuthenticationToken(
    //                     identifier,
    //                     request.getPassword()
    //             )
    //     );
    //     // 4️⃣ Login thành công
    //     return buildAuthResponse(user);
    // }
    @Override
    public AuthResponse login(LoginRequest request) {

        String identifier = request.getIdentifier();

        // 1️⃣ Tìm user trước
        User user = userRepository
                .findByUsernameOrEmailOrPhone(
                        identifier,
                        identifier,
                        identifier)
                .orElseThrow(()
                        -> new RuntimeException("Sai tài khoản hoặc mật khẩu"));

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        request.getPassword()
                )
        );

        // 3️⃣ Thành công
        return buildAuthResponse(user);
    }

    // ================= REGISTER =================
    @Transactional
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
                .findByName("ROLE_CUSTOMER")
                .orElseThrow(() -> new RuntimeException("Role CUSTOMER not found"));

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setFullName(request.getFullName());

        // ===== HASH PASSWORD =====
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.getRoles().add(customerRole);

        User savedUser = userRepository.save(user);

        // ===== TẠO CUSTOMER =====
        Customer customer = new Customer();
        customer.setUser(savedUser);   // vì bạn đã dùng @OneToOne
        customer.setFullName(savedUser.getFullName());
        customer.setPhone(savedUser.getPhone());
        customer.setEmail(savedUser.getEmail());

        customerRepository.save(customer);

        // Auto login sau register
        return buildAuthResponse(savedUser);
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
                roles);
    }
}
