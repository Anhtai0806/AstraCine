package com.astracine.backend.core.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.astracine.backend.core.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByUsernameOrEmailOrPhone(
            String username,
            String email,
            String phone);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);
}
