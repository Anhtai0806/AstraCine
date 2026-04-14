package com.astracine.backend.core.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.astracine.backend.core.entity.Promotion;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.entity.UserCoupon;
import com.astracine.backend.core.repository.InvoicePromotionRepository;
import com.astracine.backend.core.repository.PromotionRepository;
import com.astracine.backend.core.repository.UserCouponRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.PromotionDTO;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final InvoicePromotionRepository invoicePromotionRepository;
    private final UserRepository userRepository;
    
    // Bổ sung kho chứa Ví Voucher cá nhân
    private final UserCouponRepository userCouponRepository;

    public List<PromotionDTO> getAllPromotions() {
        return promotionRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public PromotionDTO getPromotionById(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion not found with id: " + id));
        return convertToDTO(promotion);
    }

    public PromotionDTO createPromotion(PromotionDTO promotionDTO) {
        // Validate unique code
        if (promotionRepository.existsByCode(promotionDTO.getCode())) {
            throw new RuntimeException("Promotion code '" + promotionDTO.getCode() + "' already exists");
        }

        // Validate date range
        if (!promotionDTO.isValidDateRange()) {
            throw new RuntimeException("End date must be after or equal to start date");
        }

        // Validate percentage discount
        if (!promotionDTO.isValidPercentageDiscount()) {
            throw new RuntimeException("Percentage discount must be between 0 and 100");
        }

        Promotion promotion = convertToEntity(promotionDTO);
        promotion.setCurrentUsage(0); // Initialize usage count

        Promotion savedPromotion = promotionRepository.save(promotion);
        return convertToDTO(savedPromotion);
    }

    public PromotionDTO updatePromotion(Long id, PromotionDTO promotionDTO) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion not found with id: " + id));

        // Check if code is being changed and if new code already exists
        if (!promotion.getCode().equals(promotionDTO.getCode()) &&
                promotionRepository.existsByCode(promotionDTO.getCode())) {
            throw new RuntimeException("Promotion code '" + promotionDTO.getCode() + "' already exists");
        }

        // Validate date range
        if (!promotionDTO.isValidDateRange()) {
            throw new RuntimeException("End date must be after or equal to start date");
        }

        // Validate percentage discount
        if (!promotionDTO.isValidPercentageDiscount()) {
            throw new RuntimeException("Percentage discount must be between 0 and 100");
        }

        // Update fields
        promotion.setCode(promotionDTO.getCode());
        promotion.setDiscountType(promotionDTO.getDiscountType());
        promotion.setDiscountValue(promotionDTO.getDiscountValue());
        promotion.setStartDate(promotionDTO.getStartDate());
        promotion.setEndDate(promotionDTO.getEndDate());
        promotion.setStatus(promotionDTO.getStatus());
        promotion.setMaxUsage(promotionDTO.getMaxUsage());
        promotion.setMaxUsagePerUser(promotionDTO.getMaxUsagePerUser());
        promotion.setDescription(promotionDTO.getDescription());
        promotion.setMinOrderAmount(
                promotionDTO.getMinOrderAmount() != null ? promotionDTO.getMinOrderAmount() : BigDecimal.ZERO);
        promotion.setMaxDiscountAmount(promotionDTO.getMaxDiscountAmount());
        
        // Cập nhật trường applicableTo
        promotion.setApplicableTo(promotionDTO.getApplicableTo() != null ? promotionDTO.getApplicableTo() : "ALL");

        Promotion updatedPromotion = promotionRepository.save(promotion);
        return convertToDTO(updatedPromotion);
    }

    public void deletePromotion(Long id) {
        if (!promotionRepository.existsById(id)) {
            throw new RuntimeException("Promotion not found with id: " + id);
        }
        promotionRepository.deleteById(id);
    }

    public PromotionDTO validatePromotionCode(String code) {
        return validatePromotionCode(code, null);
    }

    // NÂNG CẤP: Tìm thẳng bằng Mã Code thay vì phải đợi Username
    public PromotionDTO validatePromotionCode(String code, String customerUsername) {
        
        // 1. TÌM TRONG BẢNG KHUYẾN MÃI CHUNG TRƯỚC
        Optional<Promotion> promoOpt = promotionRepository.findValidPromotionByCode(code, LocalDate.now());

        if (promoOpt.isPresent()) {
            Promotion promotion = promoOpt.get();
            if (promotion.getMaxUsage() != null && promotion.getCurrentUsage() >= promotion.getMaxUsage()) {
                throw new RuntimeException("Promotion code has reached maximum usage limit");
            }

            if (promotion.getMaxUsagePerUser() != null && customerUsername != null && !customerUsername.isBlank()) {
                List<String> identityCandidates = buildCustomerIdentityCandidates(customerUsername);
                if (!identityCandidates.isEmpty()) {
                    long usedByCustomer = invoicePromotionRepository.countUsageByPromotionAndCustomerUsernames(
                            promotion.getId(), identityCandidates);
                    if (usedByCustomer >= promotion.getMaxUsagePerUser()) {
                        throw new RuntimeException("Promotion code has reached per-user usage limit");
                    }
                }
            }
            return convertToDTO(promotion);
        }

        // 2. NẾU KHÔNG CÓ TRONG BẢNG CHUNG -> TÌM TRONG VÍ VOUCHER BẰNG MÃ CODE
        Optional<UserCoupon> ucOpt = userCouponRepository.findByCode(code);
if (ucOpt.isPresent()) {
    UserCoupon uc = ucOpt.get();

    // 🔥 FIX: check đúng user (tránh dùng nhầm voucher người khác)
    if (customerUsername != null && !customerUsername.isBlank()) {
        Optional<User> uOpt = userRepository.findByUsernameOrEmailOrPhone(
                customerUsername, customerUsername, customerUsername);

        if (uOpt.isPresent() && !uc.getUser().getId().equals(uOpt.get().getId())) {
            throw new RuntimeException("Mã khuyến mãi này không thuộc về tài khoản của bạn.");
        }
    }

    if (uc.isUsed()) {
        throw new RuntimeException("Mã khuyến mãi này đã được sử dụng.");
    }

    if (uc.getExpiredAt().isBefore(java.time.LocalDateTime.now())) {
        throw new RuntimeException("Mã khuyến mãi đã hết hạn.");
    }

    PromotionDTO dto = new PromotionDTO();
    dto.setCode(uc.getCode());
    dto.setDiscountType("PERCENTAGE");
    dto.setDiscountValue(BigDecimal.valueOf(uc.getDiscountPercent()));
    dto.setMaxDiscountAmount(uc.getMaxDiscountAmount());

    String applyTo = uc.getTargetType();
    if ("FNB".equalsIgnoreCase(applyTo)) {
        applyTo = "COMBO";
    }

    dto.setApplicableTo(applyTo);
    dto.setDescription("Voucher ưu đãi nâng hạng");
    return dto;
}

        // 3. KHÔNG TÌM THẤY Ở ĐÂU CẢ
        throw new RuntimeException("Mã không còn hiệu lực hoặc đã hết lượt sử dụng.");
    }

    private PromotionDTO convertToDTO(Promotion promotion) {
        PromotionDTO dto = new PromotionDTO();
        dto.setId(promotion.getId());
        dto.setCode(promotion.getCode());
        dto.setDiscountType(promotion.getDiscountType());
        dto.setDiscountValue(promotion.getDiscountValue());
        dto.setStartDate(promotion.getStartDate());
        dto.setEndDate(promotion.getEndDate());
        dto.setStatus(promotion.getStatus());
        dto.setMaxUsage(promotion.getMaxUsage());
        dto.setMaxUsagePerUser(promotion.getMaxUsagePerUser());
        dto.setCurrentUsage(promotion.getCurrentUsage());
        dto.setDescription(promotion.getDescription());
        dto.setMinOrderAmount(promotion.getMinOrderAmount());
        dto.setMaxDiscountAmount(promotion.getMaxDiscountAmount());
        dto.setApplicableTo(promotion.getApplicableTo());
        return dto;
    }

    private Promotion convertToEntity(PromotionDTO dto) {
        Promotion promotion = new Promotion();
        promotion.setCode(dto.getCode());
        promotion.setDiscountType(dto.getDiscountType());
        promotion.setDiscountValue(dto.getDiscountValue());
        promotion.setStartDate(dto.getStartDate());
        promotion.setEndDate(dto.getEndDate());
        promotion.setStatus(dto.getStatus());
        promotion.setMaxUsage(dto.getMaxUsage());
        promotion.setMaxUsagePerUser(dto.getMaxUsagePerUser());
        promotion.setCurrentUsage(dto.getCurrentUsage() != null ? dto.getCurrentUsage() : 0);
        promotion.setDescription(dto.getDescription());
        promotion.setMinOrderAmount(dto.getMinOrderAmount() != null ? dto.getMinOrderAmount() : BigDecimal.ZERO);
        promotion.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        promotion.setApplicableTo(dto.getApplicableTo() != null ? dto.getApplicableTo() : "ALL");
        return promotion;
    }

    private List<String> buildCustomerIdentityCandidates(String customerIdentifier) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (customerIdentifier != null && !customerIdentifier.isBlank()) {
            String normalized = customerIdentifier.trim();
            candidates.add(normalized);
            userRepository.findByUsernameOrEmailOrPhone(normalized, normalized, normalized).ifPresent(user -> {
                if (user.getUsername() != null && !user.getUsername().isBlank()) {
                    candidates.add(user.getUsername().trim());
                }
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    candidates.add(user.getEmail().trim());
                }
                if (user.getPhone() != null && !user.getPhone().isBlank()) {
                    candidates.add(user.getPhone().trim());
                }
            });
        }
        return new ArrayList<>(candidates);
    }
}