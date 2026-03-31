package com.astracine.backend.core.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.astracine.backend.core.entity.Customer;
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByUserId(Long userId);
    Boolean existsByUserId(Long userId);
}