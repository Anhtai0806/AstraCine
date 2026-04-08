package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = :roleName")
    long countUsersByRoleName(@Param("roleName") String roleName);

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    Optional<User> findByUsernameOrEmailOrPhone(String username, String email, String phone);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    @Query("""
            SELECT DISTINCT u FROM User u
            JOIN u.roles r
            WHERE r.name = 'ROLE_STAFF'
              AND u.enabled = true
              AND u.status = 'ACTIVE'
              AND u.staffPosition IS NOT NULL
              AND u.fullName IS NOT NULL AND TRIM(u.fullName) <> ''
              AND u.email IS NOT NULL AND TRIM(u.email) <> ''
              AND u.phone IS NOT NULL AND TRIM(u.phone) <> ''
            ORDER BY u.username ASC
            """)
    List<User> findActiveStaffCandidates();

    @Query("""
            SELECT DISTINCT u FROM User u
            JOIN u.roles r
            WHERE r.name = 'ROLE_STAFF'
              AND u.enabled = true
              AND u.status = 'ACTIVE'
              AND u.staffPosition IS NOT NULL
              AND u.fullName IS NOT NULL AND TRIM(u.fullName) <> ''
              AND u.email IS NOT NULL AND TRIM(u.email) <> ''
              AND u.phone IS NOT NULL AND TRIM(u.phone) <> ''
              AND (
                    u.seasonalOnly = false
                    OR (
                        u.seasonalOnly = true
                        AND u.seasonalStartDate IS NOT NULL
                        AND u.seasonalEndDate IS NOT NULL
                        AND :businessDate BETWEEN u.seasonalStartDate AND u.seasonalEndDate
                    )
              )
            ORDER BY u.username ASC
            """)
    List<User> findEligibleStaffForDate(@Param("businessDate") LocalDate businessDate);

    @Query("""
            SELECT u FROM User u
            JOIN u.roles r
            WHERE r.name = 'ROLE_CUSTOMER'
            """)
    Page<User> findCustomers(Pageable pageable);

    @Query("""
            SELECT u FROM User u
            JOIN u.roles r
            WHERE r.name = 'ROLE_CUSTOMER'
              AND (
                    LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<User> searchCustomers(@Param("keyword") String keyword, Pageable pageable);
}
