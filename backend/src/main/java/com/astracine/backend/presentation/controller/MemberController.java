package com.astracine.backend.presentation.controller;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.astracine.backend.core.entity.Customer;
import com.astracine.backend.core.entity.MembershipLevel;
import com.astracine.backend.core.repository.CustomerRepository;
import com.astracine.backend.core.repository.MembershipRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
public class MemberController {

    private final CustomerRepository customerRepository;
    private final MembershipRepository membershipRepository;

    // 👉 API phụ (có thể giữ)
    @GetMapping("/{userId}")
    public Customer getProfile(@PathVariable Long userId) {
        return customerRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    // 🔥 API chính cho FE
    @GetMapping("/profile")
    public Map<String, Object> getMemberProfile(@RequestParam Long userId) {

        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        // ✅ FIX membership null
        MembershipLevel currentLevel = customer.getMembership();
        if (currentLevel == null) {
            currentLevel = membershipRepository.findById(1L)
                    .orElseThrow(() -> new RuntimeException("Default membership not found"));
            customer.setMembership(currentLevel);
        }

        Map<String, Object> res = new HashMap<>();

        // ✅ BASIC
        res.put("name", customer.getFullName());
        res.put("points", customer.getPoints());
        res.put("membership", currentLevel.getName());

        // ✅ MONEY (fix null BigDecimal)
        BigDecimal currentSpent = customer.getTotalSpent() != null
                ? customer.getTotalSpent()
                : BigDecimal.ZERO;

        double totalSpent = currentSpent.doubleValue();
        res.put("totalSpent", totalSpent);

        // ✅ CARD
        res.put("cardNumber", "ASTRA" + customer.getId());

        res.put("activatedDate",
                customer.getCreatedAt() != null
                        ? customer.getCreatedAt().toLocalDate().toString()
                        : "N/A"
        );

        // ✅ BENEFIT
        res.put("ticketRate", currentLevel.getTicketPointRate());
        res.put("comboRate", currentLevel.getComboPointRate());
        res.put("discount", currentLevel.getDiscountPercent());

        // 🔥 FIX QUAN TRỌNG NHẤT: NEXT LEVEL
        List<MembershipLevel> levels = membershipRepository.findAll();

        MembershipLevel nextLevel = levels.stream()
                .filter(l -> l.getMinTotalSpent() != null
                        && l.getMinTotalSpent().compareTo(currentSpent) > 0)
                .sorted((a, b) -> a.getMinTotalSpent().compareTo(b.getMinTotalSpent()))
                .findFirst()
                .orElse(null);

        double nextMin;

        if (nextLevel != null) {
            nextMin = nextLevel.getMinTotalSpent().doubleValue();
            res.put("nextLevel", nextLevel.getName());
        } else {
            nextMin = totalSpent;
            res.put("nextLevel", "MAX");
        }

        res.put("nextLevelMinSpent", nextMin);

        // ✅ PROGRESS
        double progress = nextMin == 0 ? 0 : (totalSpent / nextMin) * 100;
        res.put("progress", Math.min(progress, 100));

        // ✅ REMAINING
        res.put("remainingToNextLevel", Math.max(nextMin - totalSpent, 0));

        // ✅ HISTORY (mock)
        res.put("history", new Object[]{});

        return res;
    }
}