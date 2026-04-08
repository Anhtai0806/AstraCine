package com.astracine.backend.core.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.astracine.backend.core.entity.MembershipLevel;

@Repository
public interface MembershipRepository extends JpaRepository<MembershipLevel, Long> {

    // ✔️ Level hiện tại
    @Query("SELECT m FROM MembershipLevel m WHERE m.minTotalSpent <= :totalSpent ORDER BY m.minTotalSpent DESC")
    List<MembershipLevel> findCurrentLevelList(BigDecimal totalSpent);

    // ✔️ Level tiếp theo (QUAN TRỌNG NHẤT)
    @Query("SELECT m FROM MembershipLevel m WHERE m.minTotalSpent > :totalSpent ORDER BY m.minTotalSpent ASC")
    List<MembershipLevel> findNextLevelList(BigDecimal totalSpent);
}