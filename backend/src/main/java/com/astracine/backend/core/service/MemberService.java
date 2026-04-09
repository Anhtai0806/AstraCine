package com.astracine.backend.core.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;

import com.astracine.backend.core.entity.Customer;
import com.astracine.backend.core.entity.MembershipLevel;
import com.astracine.backend.core.repository.MembershipRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberService {

    private final MembershipRepository membershipRepository;
    private final PromotionService promotionService; // Inject PromotionService để gọi hàm sinh mã

    // 🎯 Tính điểm
    public int calculatePoints(Customer customer, BigDecimal ticketAmount, BigDecimal comboAmount) {

        MembershipLevel level = customer.getMembership();

        double ticketRate = level.getTicketPointRate();
        double comboRate = level.getComboPointRate();

        // Tính theo phần trăm (%) đã fix
        double ticketPoints = (ticketAmount.doubleValue() * (ticketRate / 100.0)) / 1000.0;
        double comboPoints = (comboAmount.doubleValue() * (comboRate / 100.0)) / 1000.0;

        return (int) Math.floor(ticketPoints + comboPoints);
    }

    // Update hạng và Bóp cò phát quà
    public void updateMembership(Customer customer) {

        BigDecimal currentSpent = customer.getTotalSpent() != null
                ? customer.getTotalSpent()
                : BigDecimal.ZERO;

        List<MembershipLevel> levels = membershipRepository.findAll();

        MembershipLevel newLevel = levels.stream()
                .filter(l -> l.getMinTotalSpent() != null &&
                        l.getMinTotalSpent().compareTo(currentSpent) <= 0)
                .sorted((a, b) -> b.getMinTotalSpent().compareTo(a.getMinTotalSpent()))
                .findFirst()
                .orElse(null);

        if (newLevel != null) {
            MembershipLevel oldLevel = customer.getMembership();

            // So sánh xem có phải thăng hạng không (ID mới lớn hơn ID cũ)
            // Nếu khách mới tinh (oldLevel == null) mà được nhảy thẳng lên VIP (do mua
            // nhiều) thì cũng tính là Upgraded
            boolean isUpgraded = false;
            if (oldLevel == null && newLevel.getId() > 1) {
                isUpgraded = true;
            } else if (oldLevel != null && newLevel.getId() > oldLevel.getId()) {
                isUpgraded = true;
            }

            customer.setMembership(newLevel);

            // BẮT ĐẦU LUỒNG PHÁT THƯỞNG
            if (isUpgraded) {
                distributeUpgradeRewards(customer, newLevel.getName());
            }
        }
    }

    // 🎁 Hàm chia quà
    private void distributeUpgradeRewards(Customer customer, String levelName) {
        int numCodes = 0;

        if ("ELITE".equalsIgnoreCase(levelName)) {
            numCodes = 2;
        } else if ("VIP".equalsIgnoreCase(levelName)) {
            numCodes = 6;
        } else if ("VVIP".equalsIgnoreCase(levelName)) {
            numCodes = 9;
        }

        if (numCodes > 0) {
            // 1. Sinh mã tự động
            List<String> rewardCodes = promotionService.generateUpgradeRewards(customer.getId(), levelName, numCodes);

            // 2. In ra console để bạn dễ kiểm tra
            log.info("🎉🎉🎉 CHÚC MỪNG KHÁCH HÀNG THĂNG HẠNG {} 🎉🎉🎉", levelName);
            log.info("Tặng user ID {} các mã giảm 100% vé phim: {}", customer.getId(), rewardCodes);

            // 3. (Gợi ý nâng cấp) Gọi EmailService gửi danh sách rewardCodes cho khách
            // String targetEmail = customer.getEmail() != null ? customer.getEmail() :
            // customer.getUser().getEmail();
            // emailService.sendUpgradeRewardEmail(targetEmail, levelName, rewardCodes);
        }
    }

    // 💰 Xử lý sau khi thanh toán
    public void processAfterPayment(Customer customer, BigDecimal ticketAmount, BigDecimal comboAmount) {

        BigDecimal total = ticketAmount.add(comboAmount);

        if (customer.getTotalSpent() == null) {
            customer.setTotalSpent(BigDecimal.ZERO);
        }

        // 1. cộng tiền thực trả
        customer.setTotalSpent(customer.getTotalSpent().add(total));

        // 2. tính điểm
        int earnedPoints = calculatePoints(customer, ticketAmount, comboAmount);

        // 3. cộng điểm
        customer.setPoints(customer.getPoints() + earnedPoints);

        // 4. update hạng và phát quà
        updateMembership(customer);
    }

    // Dùng điểm
    public BigDecimal applyPoints(Customer customer, int pointsUsed) {

        if (customer.getPoints() < pointsUsed) {
            throw new RuntimeException("Không đủ điểm");
        }

        customer.setPoints(customer.getPoints() - pointsUsed);

        return BigDecimal.valueOf(pointsUsed * 1000); // 1 điểm = 1000đ
    }
}