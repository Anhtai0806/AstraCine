package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.astracine.backend.core.entity.Combo;

import java.util.List;

@Repository
public interface ComboRepository extends JpaRepository<Combo, Long> {
    List<Combo> findByStatus(String status);
}
