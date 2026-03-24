package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Promotion;
import com.astracine.backend.core.repository.PromotionRepository;
import com.astracine.backend.presentation.dto.PromotionDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PromotionService {

    private final PromotionRepository promotionRepository;

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
        promotion.setDescription(promotionDTO.getDescription());
        promotion.setMinOrderAmount(
                promotionDTO.getMinOrderAmount() != null ? promotionDTO.getMinOrderAmount() : BigDecimal.ZERO);

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
        Promotion promotion = promotionRepository.findValidPromotionByCode(code, LocalDate.now())
                .orElseThrow(() -> new RuntimeException("Invalid or expired promotion code"));

        // Check if promotion has reached max usage
        if (promotion.getMaxUsage() != null &&
                promotion.getCurrentUsage() >= promotion.getMaxUsage()) {
            throw new RuntimeException("Promotion code has reached maximum usage limit");
        }

        return convertToDTO(promotion);
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
        dto.setCurrentUsage(promotion.getCurrentUsage());
        dto.setDescription(promotion.getDescription());
        dto.setMinOrderAmount(promotion.getMinOrderAmount());
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
        promotion.setCurrentUsage(dto.getCurrentUsage() != null ? dto.getCurrentUsage() : 0);
        promotion.setDescription(dto.getDescription());
        promotion.setMinOrderAmount(dto.getMinOrderAmount() != null ? dto.getMinOrderAmount() : BigDecimal.ZERO);
        return promotion;
    }
}
