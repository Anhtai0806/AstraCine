package com.astracine.backend.presentation.controller.client;

import com.astracine.backend.core.service.PromotionService;
import com.astracine.backend.presentation.dto.PromotionDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class ClientPromotionController {

    private final PromotionService promotionService;

    @GetMapping
    public ResponseEntity<List<PromotionDTO>> getAllPromotions() {
        List<PromotionDTO> promotions = promotionService.getAllPromotions();
        return ResponseEntity.ok(promotions);
    }

    @GetMapping("/validate/{code}")
    public ResponseEntity<PromotionDTO> validatePromotionCode(@PathVariable String code) {
        PromotionDTO promotion = promotionService.validatePromotionCode(code);
        return ResponseEntity.ok(promotion);
    }
}
