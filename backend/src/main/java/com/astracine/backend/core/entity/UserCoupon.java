package com.astracine.backend.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_coupons")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCoupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Liên kết với tài khoản người dùng
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Mã định danh voucher (Ví dụ: ELITE-50-XXXX)
    @Column(unique = true, length = 50)
    private String code; 

    // Loại áp dụng: TICKET (Vé phim) hoặc FNB (Bắp nước)
    @Column(name = "target_type", length = 20, nullable = false)
    private String targetType; 

    // Phần trăm giảm giá (50, 80, 100...)
    @Column(name = "discount_percent", nullable = false)
    private Integer discountPercent; 

    // Mức giảm tối đa (VD: 100000.00)
    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    // Trạng thái sử dụng
    @JsonProperty("isUsed") 
    @Column(name = "is_used", nullable = false)
    private boolean isUsed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    // Tự động gán ngày tạo khi lưu voucher vào DB
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}