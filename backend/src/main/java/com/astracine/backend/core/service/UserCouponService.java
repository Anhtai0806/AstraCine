package com.astracine.backend.core.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.entity.UserCoupon;
import com.astracine.backend.core.repository.UserCouponRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserCouponService {

    private final UserCouponRepository userCouponRepository;

    /**
     * Hàm helper để tạo và lưu Coupon vào DB
     */
    private void createAndSaveCoupon(User user, String targetType, int percent, double maxAmount, int quantity) {
        for (int i = 0; i < quantity; i++) {
            UserCoupon coupon = UserCoupon.builder()
                    .user(user)
                    .code(generateUniqueCode(targetType)) // Tạo mã xịn xò: VD: TICKET-8A9B1234
                    .targetType(targetType)
                    .discountPercent(percent)
                    .maxDiscountAmount(BigDecimal.valueOf(maxAmount))
                    .isUsed(false)
                    .expiredAt(LocalDateTime.now().plusMonths(3)) // Hạn sử dụng 3 tháng
                    .build();
            
            userCouponRepository.save(coupon);
        }
    }

    /**
     * Hàm tạo mã code ngẫu nhiên không đụng hàng
     */
    private String generateUniqueCode(String type) {
        String randomStr = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return type + "-" + randomStr; 
    }


    // ==========================================
    // 1. CÁC HÀM BẮN QUÀ CHO TỪNG HẠNG (TIERS)
    // ==========================================

    @Transactional
    public void giftEliteCoupons(User user) {
        createAndSaveCoupon(user, "TICKET", 50, 100000, 2);
        createAndSaveCoupon(user, "FNB", 20, 50000, 1);
    }

    @Transactional
    public void giftVipCoupons(User user) {
        createAndSaveCoupon(user, "TICKET", 100, 100000, 2);
        createAndSaveCoupon(user, "FNB", 20, 50000, 1);
        createAndSaveCoupon(user, "FNB", 30, 80000, 1);
    }

    @Transactional
    public void giftVvipCoupons(User user) {
        createAndSaveCoupon(user, "TICKET", 100, 100000, 6);
        createAndSaveCoupon(user, "FNB", 20, 50000, 1);
        createAndSaveCoupon(user, "FNB", 30, 80000, 1);
        createAndSaveCoupon(user, "FNB", 50, 150000, 1);
    }


    // ==========================================
    // 2. LOGIC SỬ DỤNG VOUCHER KHI THANH TOÁN
    // ==========================================

    /**
     * Hàm kiểm tra mã hợp lệ 
     */
    public UserCoupon validateCoupon(Long userId, String code) {
        UserCoupon coupon = userCouponRepository.findByCodeAndUserId(code, userId)
                .orElseThrow(() -> new RuntimeException("Mã khuyến mãi không tồn tại hoặc không thuộc về bạn."));

        if (coupon.isUsed()) {
            throw new RuntimeException("Mã khuyến mãi này đã được sử dụng.");
        }

        if (coupon.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã khuyến mãi đã hết hạn.");
        }

        return coupon;
    }

    /**
     * Hàm Bóp cò tiêu thụ (Cập nhật isUsed = true)
     */
    @Transactional
    public void consumeCoupon(Long userId, String code) {
        UserCoupon coupon = validateCoupon(userId, code);
        
        // Tùy theo Lombok của bạn sinh ra hàm là setUsed hay setIsUsed
        // Đa số trường hợp boolean isUsed thì lombok sẽ sinh ra setUsed
        coupon.setUsed(true); 
        
        userCouponRepository.save(coupon);
    }
}