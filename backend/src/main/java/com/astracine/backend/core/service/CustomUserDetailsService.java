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
                        throw new DisabledException("User is not active");
                }

                if (Boolean.FALSE.equals(user.getEnabled())) {
                        throw new DisabledException("User is disabled");
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
