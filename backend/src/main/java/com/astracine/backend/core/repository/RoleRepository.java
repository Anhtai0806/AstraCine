package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.astracine.backend.core.entity.Role;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByName(String name);

}
