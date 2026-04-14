package com.astracine.backend.presentation.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.astracine.backend.core.entity.UserCoupon;
import com.astracine.backend.core.repository.UserCouponRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin("*")
public class UserCouponController {

    private final UserCouponRepository userCouponRepository;

    /**
     * ✅ API: Lấy toàn bộ voucher của user
     * FIX: thêm @Transactional để tránh lỗi Lazy
     */
    @GetMapping("/{userId}/coupons")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getUserCoupons(@PathVariable Long userId) {

        List<UserCoupon> coupons = userCouponRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Map<String, Object>> result = coupons.stream().map(this::mapToResponse).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ API: Lấy voucher còn sử dụng được (optional - rất nên có)
     */
    @GetMapping("/{userId}/coupons/valid")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getValidCoupons(@PathVariable Long userId) {

        List<UserCoupon> coupons = userCouponRepository.findValidCouponsByUserId(
                userId,
                LocalDateTime.now()
        );

        List<Map<String, Object>> result = coupons.stream().map(this::mapToResponse).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ Mapper trả về đúng format FE cần
     */
    private Map<String, Object> mapToResponse(UserCoupon c) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", c.getId());
        map.put("code", c.getCode());
        map.put("targetType", c.getTargetType());
        map.put("discountPercent", c.getDiscountPercent());
        map.put("maxDiscountAmount", c.getMaxDiscountAmount());
        map.put("isUsed", c.isUsed());
        map.put("expiredAt", c.getExpiredAt());
        return map;
    }
}