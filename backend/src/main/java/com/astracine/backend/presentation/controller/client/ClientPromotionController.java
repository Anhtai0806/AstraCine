package com.astracine.backend.presentation.controller.client;

import com.astracine.backend.core.service.PromotionService;
import com.astracine.backend.presentation.dto.PromotionDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    public ResponseEntity<PromotionDTO> validatePromotionCode(
            @PathVariable String code,
            @RequestParam(required = false) String customerUsername,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId) {
        String resolvedCustomer = resolveCustomerIdentifier(customerUsername, user, guestUserId);
        PromotionDTO promotion = promotionService.validatePromotionCode(code, resolvedCustomer);
        return ResponseEntity.ok(promotion);
    }

    private String resolveCustomerIdentifier(String customerUsername, UserDetails user, String guestUserId) {
        if (customerUsername != null && !customerUsername.isBlank()) {
            return customerUsername.trim();
        }
        if (user != null && user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername().trim();
        }
        if (guestUserId != null && !guestUserId.isBlank()) {
            return guestUserId.trim();
        }
        return null;
    }
}
