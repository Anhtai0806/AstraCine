package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.*;
import com.astracine.backend.core.repository.*;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import com.astracine.backend.presentation.dto.invoice.InvoiceHistoryDTO;
import com.astracine.backend.presentation.dto.invoice.ETicketDTO;
import lombok.Builder;
import lombok.Data;
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
    private final MovieRepository movieRepository;
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
        Optional<User> userOpt = userRepository.findByUsernameOrEmailOrPhone(userId, userId, userId);

        // customerUsername: lưu trực tiếp để query lịch sử sau này
        String customerUsername = userOpt.map(User::getUsername).orElse(userId);

        // staffId: null khi customer tự đặt online
        Long staffId = null;

        // 3. Tạo Invoice
        Invoice newInvoice = Invoice.builder()
                .showtime(showtime)
                .staffId(staffId)
                .customerUsername(customerUsername)
                .totalAmount(amount)
                .status("PAID")
                .build();
        final Invoice inv = invoiceRepository.save(newInvoice);
        log.info("[Invoice] Created id={} holdId={} orderCode={} customerUsername={}",
                inv.getId(), holdId, orderCode, customerUsername);

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

    /**
     * Lấy lịch sử mua hàng của user đang đăng nhập.
     *
     * @param username Tên đăng nhập (SpringSecurity principal)
     * @return Danh sách hoá đơn kèm chi tiết
     */

    public List<InvoiceHistoryDTO> getInvoiceHistory(String username) {
        Optional<User> userOpt = userRepository.findByUsernameOrEmailOrPhone(username, username, username);
        if (userOpt.isEmpty()) {
            log.warn("[InvoiceHistory] User not found for username={}, returning empty list", username);
            return java.util.Collections.emptyList();
        }
        User user = userOpt.get();

        List<Invoice> invoices = invoiceRepository
                .findByCustomerUsernameOrderByCreatedAtDesc(user.getUsername());

        return invoices.stream().map(inv -> {
            Showtime showtime = inv.getShowtime();

            // Movie info (title, poster)
            String movieTitle = null;
            String moviePosterUrl = null;
            if (showtime != null && showtime.getMovieId() != null) {
                Optional<Movie> movieOpt = movieRepository.findById(showtime.getMovieId());
                if (movieOpt.isPresent()) {
                    movieTitle = movieOpt.get().getTitle();
                    moviePosterUrl = movieOpt.get().getPosterUrl();
                }
            }

            // Seats
            List<Ticket> tickets = ticketRepository.findByInvoiceId(inv.getId());
            List<InvoiceHistoryDTO.SeatItem> seats = tickets.stream().map(t -> {
                ShowtimeSeat ss = t.getShowtimeSeat();
                Seat seat = ss != null ? ss.getSeat() : null;
                String code = seat != null ? seat.getRowLabel() + seat.getColumnNumber() : "?";
                String type = seat != null && seat.getSeatType() != null ? seat.getSeatType().name() : "";
                return InvoiceHistoryDTO.SeatItem.builder()
                        .seatCode(code)
                        .seatType(type)
                        .price(t.getPrice())
                        .build();
            }).toList();

            // Combos
            List<InvoiceCombo> combos = invoiceComboRepository.findByInvoiceId(inv.getId());
            List<InvoiceHistoryDTO.ComboItem> comboItems = combos.stream().map(ic -> {
                String comboName = ic.getCombo() != null ? ic.getCombo().getName() : "Combo";
                return InvoiceHistoryDTO.ComboItem.builder()
                        .comboName(comboName)
                        .quantity(ic.getQuantity())
                        .price(ic.getPrice())
                        .build();
            }).toList();

            String transCode = null;
            // Lấy Payment theo invoiceId
            Optional<Payment> paymentOpt = paymentRepository.findByInvoiceId(inv.getId());
            if (paymentOpt.isPresent()) {
                transCode = paymentOpt.get().getTransactionCode();
            }

            return InvoiceHistoryDTO.builder()
                    .invoiceId(inv.getId())
                    .status(inv.getStatus())
                    .totalAmount(inv.getTotalAmount())
                    .createdAt(inv.getCreatedAt())
                    .showtimeId(showtime != null ? showtime.getId() : null)
                    .movieId(showtime != null ? showtime.getMovieId() : null)
                    .movieTitle(movieTitle)
                    .moviePosterUrl(moviePosterUrl)
                    .startTime(showtime != null ? showtime.getStartTime() : null)
                    .endTime(showtime != null ? showtime.getEndTime() : null)
                    .roomName(showtime != null && showtime.getRoom() != null ? showtime.getRoom().getName() : null)
                    .seats(seats)
                    .combos(comboItems)
                    .orderCode(transCode) // 👈 NHÉT CHÌA KHÓA VÀO ĐÂY LÀ XONG!
                    .build();
        }).toList();
    }

    /**
     * Lấy thông tin E-ticket theo orderCode (transactionCode trong bảng payments).
     * Dùng cho trang hiển thị vé sau khi thanh toán thành công.
     */
    @Transactional(readOnly = true)
    public ETicketDTO getETicketByOrderCode(String orderCode) {
        // 1. Tìm Payment theo transactionCode = orderCode
        Payment payment = paymentRepository.findByTransactionCode(orderCode)
                .orElseThrow(
                        () -> new IllegalArgumentException("Không tìm thấy thanh toán với orderCode=" + orderCode));

        // 2. Lấy Invoice → Showtime → Movie, Room
        Invoice inv = payment.getInvoice();
        Showtime showtime = inv.getShowtime();

        String movieTitle = null;
        String ageRating = null;
        Integer durationMinutes = null;
        if (showtime != null && showtime.getMovieId() != null) {
            Optional<Movie> movieOpt = movieRepository.findById(showtime.getMovieId());
            if (movieOpt.isPresent()) {
                Movie movie = movieOpt.get();
                movieTitle = movie.getTitle();
                ageRating = movie.getAgeRating();
                durationMinutes = movie.getDurationMinutes();
            }
        }

        String roomName = (showtime != null && showtime.getRoom() != null)
                ? showtime.getRoom().getName()
                : null;

        // 3. Lấy tất cả Tickets → ShowtimeSeat → Seat
        List<Ticket> tickets = ticketRepository.findByInvoiceId(inv.getId());

        StringBuilder seatsBuilder = new StringBuilder();
        String seatType = null;
        String ticketCode = null;
        String qrCode = null;

        for (int i = 0; i < tickets.size(); i++) {
            Ticket t = tickets.get(i);
            ShowtimeSeat ss = t.getShowtimeSeat();
            Seat seat = ss != null ? ss.getSeat() : null;

            if (seat != null) {
                if (i > 0)
                    seatsBuilder.append(", ");
                seatsBuilder.append(seat.getRowLabel()).append(seat.getColumnNumber());

                // Lấy loại ghế từ ghế đầu tiên
                if (seatType == null && seat.getSeatType() != null) {
                    seatType = seat.getSeatType().name();
                }
            }

            // Lấy ticketCode và qrCode từ ticket đầu tiên
            if (ticketCode == null && t.getQrCode() != null) {
                ticketCode = t.getQrCode();
                qrCode = t.getQrCode();
            }
        }

        return ETicketDTO.builder()
                .movieTitle(movieTitle)
                .ageRating(ageRating)
                .durationMinutes(durationMinutes)
                .showDate(showtime != null ? showtime.getStartTime() : null)
                .startTime(showtime != null ? showtime.getStartTime() : null)
                .roomName(roomName)
                .seats(seatsBuilder.toString())
                .seatType(seatType)
                .ticketCode(ticketCode)
                .qrCode(qrCode)
                .totalAmount(inv.getTotalAmount())
                .orderCode(orderCode)
                .build();
    }
}
