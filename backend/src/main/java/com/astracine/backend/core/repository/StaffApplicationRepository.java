package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.astracine.backend.core.entity.StaffApplication;

public interface StaffApplicationRepository extends JpaRepository<StaffApplication, Long> {

    boolean existsByUsernameAndStatus(String username, String status);

    boolean existsByEmailAndStatus(String email, String status);

    boolean existsByPhoneAndStatus(String phone, String status);
}