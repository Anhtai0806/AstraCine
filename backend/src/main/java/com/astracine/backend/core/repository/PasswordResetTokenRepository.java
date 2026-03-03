package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.PasswordResetToken;
import com.astracine.backend.core.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByToken(String token);

    @Transactional
    @Modifying
    void deleteByUser(User user);
}
