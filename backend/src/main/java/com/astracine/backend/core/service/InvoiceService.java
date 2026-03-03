package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.*;
import com.astracine.backend.core.repository.*;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Tạo hóa đơn đầy đủ (Invoice + Payment + Tickets + Combos + Promotion)
 * sau khi PayOS xác nhận thanh toán thành công.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceService {

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
    private final SeatHoldService seatHoldService;

    /**
     * Tạo invoice đầy đủ từ dữ liệu PayOS khi thanh toán thành công.
     *
     * @param holdId        ID phiên giữ ghế
     * @param userId        Username (hoặc guestId) đã tạo hold
     * @param orderCode     Mã đơn PayOS
     * @param amount        Số tiền thanh toán
     * @param promotionCode Mã khuyến mãi (nullable)
     * @param comboItems    Danh sách combo đã chọn
     * @param showtimeId    ID suất chiếu (lấy từ session PayOS - tránh phụ thuộc
     *                      hold:summary TTL)
     * @param seatIds       Danh sách seatId (lấy từ session PayOS)
     */
    @Transactional
    public Invoice createInvoice(String holdId, String userId, long orderCode,
            BigDecimal amount, String promotionCode,
            List<ComboCartItemDTO> comboItems,
            long showtimeId, List<Long> seatIds) {

        // 1. Load Showtime
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalStateException("Showtime not found: " + showtimeId));

        // 2. Resolve user — tìm theo username (đăng nhập) hoặc email/phone/guestId
        // userId là username của người dùng đã đăng nhập, hoặc guestId nếu không đăng
        // nhập.
        Optional<User> userOpt = userRepository.findByUsernameOrEmailOrPhone(userId, userId, userId);

        // customerId: ID của khách hàng nếu tìm thấy, null nếu là guest không đăng nhập
        Long customerId = userOpt.map(User::getId).orElse(null);

        // staffId: null khi customer tự đặt online (không có nhân viên hỗ trợ)
        // Sẽ được gán giá trị khi staff tạo invoice thay khách (future flow)
        Long staffId = null;

        // 3. Tạo Invoice
        Invoice newInvoice = Invoice.builder()
                .showtime(showtime)
                .staffId(staffId)
                .customerId(customerId) // null khi guest, có giá trị khi đăng nhập
                .totalAmount(amount)
                .status("PAID")
                .build();
        final Invoice inv = invoiceRepository.save(newInvoice);
        log.info("[Invoice] Created id={} holdId={} orderCode={} customerId={} staffId={}",
                inv.getId(), holdId, orderCode, customerId, staffId);

        // 4. Tạo Payment
        paymentRepository.save(Payment.builder()
                .invoice(inv)
                .paymentMethod("PAYOS")
                .transactionCode(String.valueOf(orderCode))
                .amount(amount)
                .status("PAID")
                .build());

        // 5. Tạo Tickets — 1 ticket / ghế
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

        // 6. Tạo InvoiceCombos
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

        // 7. Tạo InvoicePromotion & tăng usage
        if (promotionCode != null && !promotionCode.isBlank()) {
            promotionRepository.findByCode(promotionCode).ifPresentOrElse(promo -> {
                invoicePromotionRepository.save(new InvoicePromotion(inv, promo));
                promo.setCurrentUsage(promo.getCurrentUsage() != null ? promo.getCurrentUsage() + 1 : 1);
                promotionRepository.save(promo);
            }, () -> log.warn("[Invoice] Promotion '{}' not found, skipping", promotionCode));
        }

        // 8. FIX lỗi 2: Đánh dấu ghế SOLD (best-effort — không rollback invoice nếu
        // thất bại)
        try {
            seatHoldService.confirmHoldToSold(holdId, userId);
            log.info("[Invoice] Hold {} confirmed to SOLD for orderCode={}", holdId, orderCode);
        } catch (Exception ex) {
            // Hold có thể đã expire — ghế vẫn cần được mark SOLD để tránh double-booking.
            // Fallback: update trực tiếp qua ShowtimeSeat nếu confirmHoldToSold thất bại.
            log.warn("[Invoice] confirmHoldToSold failed (holdId={}), falling back to direct seat update: {}",
                    holdId, ex.getMessage());
            markSeatsAsSold(showtimeId, seatIds);
        }

        return inv;
    }

    /**
     * Fallback: đánh dấu SOLD trực tiếp trên bảng showtime_seats
     * khi hold:seat keys đã expire (hold không còn tồn tại trong Redis).
     */
    private void markSeatsAsSold(long showtimeId, List<Long> seatIds) {
        for (Long seatId : seatIds) {
            showtimeSeatRepository.findByShowtimeIdAndSeatId(showtimeId, seatId).ifPresent(ss -> {
                try {
                    ss.setStatus(com.astracine.backend.core.enums.SeatBookingStatus.SOLD);
                    showtimeSeatRepository.save(ss);
                } catch (Exception ex2) {
                    log.error("[Invoice] Failed to mark seat {} as SOLD for showtime {}: {}",
                            seatId, showtimeId, ex2.getMessage());
                }
            });
        }
    }
}
