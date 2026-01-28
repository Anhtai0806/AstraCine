package com.astracine.backend.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import static org.springframework.security.config.Customizer.withDefaults;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http

                // 1. Tắt CSRF (cần thiết cho API REST)
                .csrf(AbstractHttpConfigurer::disable)

                // 2. Kích hoạt CORS với cấu hình bên dưới
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .authorizeHttpRequests(auth -> auth
                        // ===== PUBLIC =====
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/api/admin/**").permitAll() // TEMPORARY: For testing without auth

                        // ===== ADMIN =====
                        // .requestMatchers("/api/admin/**").hasRole("ADMIN") // TODO: Re-enable after
                        // testing

                        // ===== MANAGER =====
                        .requestMatchers("/api/manager/**").hasRole("MANAGER")

                        // ===== STAFF =====
                        .requestMatchers("/api/staff/**").hasRole("STAFF")

                        // ===== CUSTOMER (user thường) =====
                        .requestMatchers("/api/customer/**").hasRole("CUSTOMER")

                        // ===== LOGIN LÀ VÀO ĐƯỢC (trang chung) =====
                        .requestMatchers("/api/user/**")
                        .hasAnyRole("CUSTOMER", "STAFF", "MANAGER", "ADMIN")

                        // ===== CÒN LẠI =====
                        .anyRequest().authenticated())
                .httpBasic(withDefaults());
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Cho phép các method

        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:5174"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // Cho phép mọi header
        config.setAllowedHeaders(List.of("*"));

        // Cho phép gửi credentials (nếu sau này cần)
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
