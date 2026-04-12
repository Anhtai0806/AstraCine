package com.astracine.backend.infrastructure.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

import com.astracine.backend.infrastructure.security.JwtAuthenticationEntryPoint;
import com.astracine.backend.infrastructure.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint unauthorizedHandler;

    public SecurityConfig(JwtAuthenticationEntryPoint unauthorizedHandler) {
        this.unauthorizedHandler = unauthorizedHandler;
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
            throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

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
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/showtimes/**").permitAll()
                        .requestMatchers("/api/holds/**").permitAll()
                        .requestMatchers("/api/payments/payos/**").permitAll()
                        .requestMatchers("/api/test-payment/**").permitAll()
                        .requestMatchers("/api/promotions/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()

                        // ===== WEBSOCKET =====
                        .requestMatchers("/ws", "/ws/**").permitAll()
                        .requestMatchers("/ws-sockjs", "/ws-sockjs/**").permitAll()

                        // GET combos is public, POST/PUT/DELETE requires ADMIN
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/combos/**").permitAll()

                        // GET banners is public (trang chủ)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/banners").permitAll()

                        // ===== ADMIN =====
                        .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers("/api/seats/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/combos/**")
                        .hasAuthority("ROLE_ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/combos/**")
                        .hasAuthority("ROLE_ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/combos/**")
                        .hasAuthority("ROLE_ADMIN")

                        // ===== MANAGER =====
                        // .requestMatchers("/api/manager/**").hasAuthority("ROLE_MANAGER")

                        // ===== STAFF =====
                        .requestMatchers("/api/staff/**").hasAnyAuthority("ROLE_STAFF", "ROLE_ADMIN")

                        // ===== CUSTOMER (user thường) / Authenticated users =====
                        .requestMatchers("/api/user/**").authenticated()
                        .requestMatchers("/api/my/**").authenticated()

                        .requestMatchers("/ws", "/ws/**").permitAll()
                        .requestMatchers("/ws-sockjs", "/ws-sockjs/**").permitAll()

                        // ===== CÒN LẠI =====
                        .anyRequest().authenticated())
                // Use JWT Filter instead of HTTP Basic
                .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Cho phép mọi header
        config.setAllowedHeaders(List.of("*"));

        // Cho phép gửi credentials (nếu sau này cần)
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

// package com.astracine.backend.config;

// import java.util.List;

// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import
// org.springframework.security.config.annotation.web.builders.HttpSecurity;
// import
// org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
// import
// org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
// import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; //
// Import này
// import org.springframework.security.crypto.password.PasswordEncoder; //
// Import này
// import org.springframework.security.web.SecurityFilterChain;
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// @Configuration
// @EnableWebSecurity
// public class SecurityConfig {

// @Bean
// public SecurityFilterChain securityFilterChain(HttpSecurity http) throws
// Exception {
// http
// .csrf(AbstractHttpConfigurer::disable)
// .cors(cors -> cors.configurationSource(corsConfigurationSource()))
// .authorizeHttpRequests(auth -> auth
// // Mở cửa tất cả API để bạn test Frontend
// .requestMatchers("/api/**").permitAll()
// .anyRequest().permitAll()
// );

// return http.build();
// }

// // 👇 ĐÂY LÀ ĐOẠN QUAN TRỌNG BẠN ĐANG THIẾU 👇
// @Bean
// public PasswordEncoder passwordEncoder() {
// return new BCryptPasswordEncoder();
// }
// // 👆 THÊM ĐOẠN NÀY LÀ HẾT LỖI

// @Bean
// public UrlBasedCorsConfigurationSource corsConfigurationSource() {
// CorsConfiguration config = new CorsConfiguration();
// config.setAllowedOrigins(List.of(
// "http://localhost:5173",
// "http://localhost:5174",
// "http://localhost:3000"
// ));
// config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS",
// "PATCH"));
// config.setAllowedHeaders(List.of("*"));
// config.setAllowCredentials(true);

// UrlBasedCorsConfigurationSource source = new
// UrlBasedCorsConfigurationSource();
// source.registerCorsConfiguration("/**", config);
// return source;
// }
// }