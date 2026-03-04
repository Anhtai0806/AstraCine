package com.astracine.backend.core.service;

import java.util.List;

import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String input)
            throws UsernameNotFoundException {

        User user = userRepository
                .findByUsernameOrEmailOrPhone(input, input, input)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // 🔴 CHẶN TÀI KHOẢN LOCK TẠI ĐÂY
        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new LockedException(
                    user.getLockReason() != null
                    ? "Tài khoản của bạn đã bị khóa, lý do: " + user.getLockReason()
                    : "Tài khoản của bạn đã bị khóa"
            );
        }

        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.getName()))
                .toList();

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .authorities(authorities)
                .build();
    }
}
