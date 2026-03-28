package com.astracine.backend.core.service;

import java.util.List;

import org.springframework.security.authentication.DisabledException;
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

                // Check trạng thái tài khoản
                if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                        String reason = user.getLockReason();
                        String message = "Tài khoản của bạn đã bị khóa.";
                        if (reason != null && !reason.isBlank()) {
                                message += " Lý do: " + reason + ".";

                        }
                        message += " Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết hoặc được mở khóa tài khoản.";
                        throw new DisabledException(message);
                }

                if (Boolean.FALSE.equals(user.getEnabled())) {
                        throw new DisabledException("Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin để được hỗ trợ.");
                }

                List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                                .map(role -> new SimpleGrantedAuthority(role.getName()))
                                .toList();

                return new org.springframework.security.core.userdetails.User(
                                user.getUsername(),
                                user.getPassword(),
                                authorities);
        }
}
