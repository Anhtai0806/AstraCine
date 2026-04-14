package com.astracine.backend.core.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.astracine.backend.core.entity.UserCoupon;

@Repository
public interface UserCouponRepository extends JpaRepository<UserCoupon, Long> {

    /**
     * ✅ Lấy toàn bộ coupon của user (FIX Lazy Loading bằng JOIN FETCH)
     */
    @Query("SELECT c FROM UserCoupon c JOIN FETCH c.user WHERE c.user.id = :userId ORDER BY c.createdAt DESC")
    List<UserCoupon> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);


    /**
     * ✅ Lấy coupon còn dùng được (chưa dùng + chưa hết hạn)
     */
    @Query("""
        SELECT c FROM UserCoupon c 
        JOIN FETCH c.user 
        WHERE c.user.id = :userId 
        AND c.isUsed = false 
        AND c.expiredAt > :now
        ORDER BY c.createdAt DESC
    """)
    List<UserCoupon> findValidCouponsByUserId(
            @Param("userId") Long userId,
            @Param("now") LocalDateTime now
    );


    /**
     * ✅ Tìm theo code (dùng fallback nếu cần)
     */
    Optional<UserCoupon> findByCode(String code);


    /**
     * ✅ QUAN TRỌNG: Tìm theo code + user (fix lỗi apply voucher)
     */
    @Query("SELECT c FROM UserCoupon c WHERE c.code = :code AND c.user.id = :userId")
    Optional<UserCoupon> findByCodeAndUserId(
            @Param("code") String code,
            @Param("userId") Long userId
    );
}