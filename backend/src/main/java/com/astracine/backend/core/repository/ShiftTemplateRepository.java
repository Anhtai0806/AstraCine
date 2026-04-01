package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.ShiftTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {
    List<ShiftTemplate> findByActiveTrueOrderByStartTimeAsc();
}
