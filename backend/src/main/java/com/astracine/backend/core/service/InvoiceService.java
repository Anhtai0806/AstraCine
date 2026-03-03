package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.*;
import com.astracine.backend.core.repository.*;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Tạo hóa đơn đầy đủ (Invoice + Payment + Tickets + Combos + Promotion)
 * sau khi PayOS xác nhận thanh toán thành công.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final String HOLD_SUMMARY_KEY_PREFIX = "hold:summary:";
    private static final long SYSTEM_STAFF_ID = 1L;

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final InvoiceComboRepository invoiceComboRepository;
    private final InvoicePromotionRepository invoicePromotionRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final ComboRepository comboRepository;
    private final PromotionRepository promotionRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redis;

    /**
     * Tạo invoice đầy đủ từ dữ liệu PayOS khi thanh toán thành công.
     */
    @Transactional
    public Invoice createInvoice(String holdId, String userId, long orderCode,
            BigDecimal amount, String promotionCode,
            List<ComboCartItemDTO> comboItems) {

        // 1. Đọc hold summary từ Redis để lấy showtimeId và seatIds
        String summaryRaw = redis.opsForValue().get(HOLD_SUMMARY_KEY_PREFIX + holdId);
        if (summaryRaw == null) {
            log.warn("[Invoice] hold:summary:{} not found in Redis", holdId);
            throw new IllegalStateException("Hold summary not found: " + holdId);
        }
        // format: showtimeId|userId|expiresAt|seatId1,seatId2,...
        String[] parts = summaryRaw.split("\\|", 4);
        long showtimeId = Long.parseLong(parts[0]);
        List<Long> seatIds = Arrays.stream(parts[3].split(","))
                .filter(s -> !s.isBlank())
                .map(Long::parseLong)
                .collect(Collectors.toList());

        // 2. Load Showtime
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalStateException("Showtime not found: " + showtimeId));

        // 3. Resolve staffId — dùng id của user nếu có, không thì SYSTEM_STAFF_ID
        long staffId = userRepository.findByUsername(userId)
                .map(User::getId)
                .orElse(SYSTEM_STAFF_ID);

        // 4. Tạo Invoice
        Invoice newInvoice = Invoice.builder()
                .showtime(showtime)
                .staffId(staffId)
                .totalAmount(amount)
                .status("PAID")
                .build();
        final Invoice inv = invoiceRepository.save(newInvoice);
        log.info("[Invoice] Created id={} holdId={} orderCode={}", inv.getId(), holdId, orderCode);

        // 5. Tạo Payment
        paymentRepository.save(Payment.builder()
                .invoice(inv)
                .paymentMethod("PAYOS")
                .transactionCode(String.valueOf(orderCode))
                .amount(amount)
                .status("PAID")
                .build());

        // 6. Tạo Tickets — 1 ticket / ghế
        for (Long seatId : seatIds) {
            showtimeSeatRepository.findByShowtimeIdAndSeatId(showtimeId, seatId).ifPresent(ss -> {
                BigDecimal price = ss.getFinalPrice() != null ? ss.getFinalPrice() : BigDecimal.ZERO;
                ticketRepository.save(Ticket.builder()
                        .invoice(inv)
                        .showtimeSeat(ss)
                        .price(price)
                        .qrCode("TICKET-" + inv.getId() + "-" + ss.getId())
                        .status("VALID")
                        .build());
            });
        }

        // 7. Tạo InvoiceCombos
        if (comboItems != null) {
            for (ComboCartItemDTO item : comboItems) {
                if (item.getComboId() == null || item.getQuantity() == null)
                    continue;
                comboRepository.findById(item.getComboId()).ifPresent(combo -> {
                    BigDecimal itemPrice = item.getPrice() != null ? item.getPrice() : combo.getPrice();
                    invoiceComboRepository.save(InvoiceCombo.builder()
                            .invoice(inv)
                            .combo(combo)
                            .quantity(item.getQuantity())
                            .price(itemPrice)
                            .build());
                });
            }
        }

        // 8. Tạo InvoicePromotion & tăng usage
        if (promotionCode != null && !promotionCode.isBlank()) {
            promotionRepository.findByCode(promotionCode).ifPresentOrElse(promo -> {
                invoicePromotionRepository.save(new InvoicePromotion(inv, promo));
                promo.setCurrentUsage(promo.getCurrentUsage() != null ? promo.getCurrentUsage() + 1 : 1);
                promotionRepository.save(promo);
            }, () -> log.warn("[Invoice] Promotion '{}' not found, skipping", promotionCode));
        }

        return inv;
    }
}
