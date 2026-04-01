package com.astracine.backend.core.service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.astracine.backend.core.entity.Invoice;
import com.astracine.backend.core.entity.InvoiceCombo;
import com.astracine.backend.core.entity.InvoicePromotion;
import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Payment;
import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.entity.ShowtimeSeat;
import com.astracine.backend.core.entity.Ticket;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.ComboRepository;
import com.astracine.backend.core.repository.InvoiceComboRepository;
import com.astracine.backend.core.repository.InvoicePromotionRepository;
import com.astracine.backend.core.repository.InvoiceRepository;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.PaymentRepository;
import com.astracine.backend.core.repository.PromotionRepository;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.core.repository.ShowtimeSeatRepository;
import com.astracine.backend.core.repository.TicketRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.invoice.InvoiceHistoryDTO;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import com.astracine.backend.presentation.dto.invoice.ETicketDTO;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import lombok.Builder;
import lombok.Data;
import com.astracine.backend.presentation.dto.invoice.InvoiceHistoryDTO;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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
    private final EmailService emailService;

    @Transactional
    public Invoice createInvoice(String holdId, String userId, long orderCode,
            BigDecimal amount, String promotionCode,
            List<ComboCartItemDTO> comboItems,
            long showtimeId, List<Long> seatIds) {

        return createInvoiceInternal(
                holdId,
                userId,
                amount,
                promotionCode,
                comboItems,
                showtimeId,
                seatIds,
                null,
                null,
                null,
                null,
                "PAYOS",
                String.valueOf(orderCode));
    }

    @Transactional
    public Invoice createCounterInvoice(String holdId,
            String staffUsername,
            BigDecimal amount,
            String promotionCode,
            List<ComboCartItemDTO> comboItems,
            long showtimeId,
            List<Long> seatIds,
            String customerName,
            String customerEmail,
            String customerPhone,
            String paymentMethod) {

        Long staffId = userRepository.findByUsername(staffUsername)
                .map(User::getId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin nhân viên đang thao tác."));

        return createInvoiceInternal(
                holdId,
                staffUsername,
                amount,
                promotionCode,
                comboItems,
                showtimeId,
                seatIds,
                staffId,
                customerName,
                customerEmail,
                customerPhone,
                paymentMethod,
                generateCounterTransactionCode());
    }

    private Invoice createInvoiceInternal(String holdId,
            String actorUserId,
            BigDecimal amount,
            String promotionCode,
            List<ComboCartItemDTO> comboItems,
            long showtimeId,
            List<Long> seatIds,
            Long staffId,
            String customerName,
            String customerEmail,
            String customerPhone,
            String paymentMethod,
            String transactionCode) {

        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalStateException("Showtime not found: " + showtimeId));

        String customerUsername = resolveCustomerUsername(
                actorUserId,
                customerName,
                customerEmail,
                customerPhone,
                staffId != null);
        Invoice newInvoice = Invoice.builder()
                .showtime(showtime)
                .staffId(staffId)
                .customerUsername(customerUsername)
                .totalAmount(amount)
                .status("PAID")
                .build();
        Invoice invoice = invoiceRepository.save(newInvoice);
        log.info("[Invoice] Created id={} holdId={} customerUsername={} paymentMethod={}",
                invoice.getId(), holdId, customerUsername, paymentMethod);

        paymentRepository.save(Payment.builder()
                .invoice(invoice)
                .paymentMethod(normalizePaymentMethod(paymentMethod))
                .transactionCode(transactionCode)
                .amount(amount)
                .status("PAID")
                .build());

        // Sinh QR code cho hóa đơn
        String masterQrCode = "TICKET-" + invoice.getId() + "-"
                + java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        for (Long seatId : seatIds) {
            showtimeSeatRepository.findByShowtimeIdAndSeatId(showtimeId, seatId).ifPresent(ss -> {
                BigDecimal price = ss.getFinalPrice() != null ? ss.getFinalPrice() : BigDecimal.ZERO;

                ticketRepository.save(Ticket.builder()
                        .invoice(invoice)
                        .showtimeSeat(ss)
                        .price(price)
                        .qrCode(masterQrCode)
                        .status("VALID")
                        .build());
            });
        }

        saveInvoiceCombos(invoice, comboItems);
        saveInvoicePromotion(invoice, promotionCode);

        try {
            seatHoldService.confirmHoldToSold(holdId, actorUserId);
            log.info("[Invoice] Hold {} confirmed to SOLD for invoice={}", holdId, invoice.getId());
        } catch (Exception ex) {
            log.warn("[Invoice] confirmHoldToSold failed (holdId={}), falling back to direct seat update: {}",
                    holdId, ex.getMessage());
            markSeatsAsSold(showtimeId, seatIds);
        }

        // KÍCH HOẠT GỬI EMAIL VÉ
        try {
            String targetEmail = customerEmail;
            
            // Nếu không có email tham số (ví dụ online booking), lấy từ user liên kết
            if (targetEmail == null || targetEmail.isBlank()) {
                Optional<User> uOpt = userRepository.findByUsernameOrEmailOrPhone(customerUsername, customerUsername, customerUsername);
                if (uOpt.isPresent() && uOpt.get().getEmail() != null && !uOpt.get().getEmail().isBlank()) {
                    targetEmail = uOpt.get().getEmail();
                }
            }
            
            final String finalTargetEmail = targetEmail;
            if (finalTargetEmail != null && !finalTargetEmail.isBlank()) {
                // Lấy thông tin vé đồng bộ ngay trong transaction hiện tại để tránh lỗi proxy/chưa commit
                ETicketDTO printTicket = getETicketByOrderCode(transactionCode);
                
                // Tạo một luồng mới để gửi thư
                java.util.concurrent.CompletableFuture.runAsync(() -> {
                    try {
                        emailService.sendTicketEmail(finalTargetEmail, printTicket);
                        log.info("[Invoice] Successfully dispatched ticket email to {}", finalTargetEmail);
                    } catch (Exception e) {
                        log.error("[Invoice] Failed to send ticket email to " + finalTargetEmail, e);
                    }
                });
            } else {
                log.info("[Invoice] No valid email found to send ticket for invoice=${}", invoice.getId());
            }

        } catch (Exception e) {
            log.error("[Invoice] Error preparing ticket email: {}", e.getMessage(), e);
        }

        return invoice;
    }

    private void saveInvoiceCombos(Invoice invoice, List<ComboCartItemDTO> comboItems) {
        if (comboItems == null) {
            return;
        }

        for (ComboCartItemDTO item : comboItems) {
            if (item == null || item.getComboId() == null || item.getQuantity() == null) {
                continue;
            }
            comboRepository.findById(item.getComboId()).ifPresent(combo -> {
                // Kiểm tra tồn kho
                int currentStock = combo.getStockQuantity() != null ? combo.getStockQuantity() : 0;
                int requested = item.getQuantity();
                if (currentStock < requested) {
                    throw new IllegalStateException(
                        "Combo \"" + combo.getName() + "\" chỉ còn " + currentStock + " sản phẩm, không đủ số lượng yêu cầu (" + requested + ")."
                    );
                }

                // Trừ tồn kho
                combo.setStockQuantity(currentStock - requested);
                comboRepository.save(combo);

                BigDecimal itemPrice = item.getPrice() != null ? item.getPrice() : combo.getPrice();
                invoiceComboRepository.save(InvoiceCombo.builder()
                        .invoice(invoice)
                        .combo(combo)
                        .quantity(requested)
                        .price(itemPrice)
                        .build());
            });
        }
    }

    private void saveInvoicePromotion(Invoice invoice, String promotionCode) {
        if (promotionCode == null || promotionCode.isBlank()) {
            return;
        }

        promotionRepository.findByCode(promotionCode).ifPresentOrElse(promo -> {
            invoicePromotionRepository.save(new InvoicePromotion(invoice, promo));
            promo.setCurrentUsage(promo.getCurrentUsage() != null ? promo.getCurrentUsage() + 1 : 1);
            promotionRepository.save(promo);
        }, () -> log.warn("[Invoice] Promotion '{}' not found, skipping", promotionCode));
    }

    private String resolveCustomerUsername(
            String actorUserId,
            String customerName,
            String customerEmail,
            String customerPhone,
            boolean counterSale) {

        Optional<User> matchedUser = Optional.empty();

        if (customerEmail != null && !customerEmail.isBlank()) {
            matchedUser = userRepository.findByUsernameOrEmailOrPhone(
                    customerEmail.trim(),
                    customerEmail.trim(),
                    customerEmail.trim());
        }

        if (matchedUser.isEmpty() && customerPhone != null && !customerPhone.isBlank()) {
            matchedUser = userRepository.findByUsernameOrEmailOrPhone(
                    customerPhone.trim(),
                    customerPhone.trim(),
                    customerPhone.trim());
        }

        // Chỉ với luồng online mới được fallback sang actorUserId
        if (!counterSale && matchedUser.isEmpty() && actorUserId != null && !actorUserId.isBlank()) {
            matchedUser = userRepository.findByUsernameOrEmailOrPhone(
                    actorUserId.trim(),
                    actorUserId.trim(),
                    actorUserId.trim());
        }

        if (matchedUser.isPresent()) {
            return matchedUser.get().getUsername();
        }

        // Luồng quầy: ưu tiên tên khách hiển thị trên hóa đơn
        if (counterSale) {
            if (customerName != null && !customerName.isBlank()) {
                return customerName.trim();
            }
            if (customerPhone != null && !customerPhone.isBlank()) {
                return customerPhone.trim();
            }
            if (customerEmail != null && !customerEmail.isBlank()) {
                return customerEmail.trim();
            }
            return "WALK_IN";
        }

        // Luồng online giữ nguyên fallback cũ
        if (customerEmail != null && !customerEmail.isBlank()) {
            return customerEmail.trim();
        }
        if (customerPhone != null && !customerPhone.isBlank()) {
            return customerPhone.trim();
        }
        if (customerName != null && !customerName.isBlank()) {
            return customerName.trim();
        }
        if (actorUserId != null && !actorUserId.isBlank()) {
            return actorUserId.trim();
        }
        return "WALK_IN";
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "PAYOS";
        }
        String normalized = paymentMethod.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "PAYOS", "CASH", "CARD" -> normalized;
            default -> normalized;
        };
    }

    private String generateCounterTransactionCode() {
        return "COUNTER-" + System.currentTimeMillis();
    }

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

    public List<InvoiceHistoryDTO> getInvoiceHistory(String username) {
        Optional<User> userOpt = userRepository.findByUsernameOrEmailOrPhone(username, username, username);
        if (userOpt.isEmpty()) {
            log.warn("[InvoiceHistory] User not found for username={}, returning empty list", username);
            return Collections.emptyList();
        }
        User user = userOpt.get();

        List<Invoice> invoices = invoiceRepository
                .findByCustomerUsernameOrderByCreatedAtDesc(user.getUsername());

        return invoices.stream().map(inv -> {
            Showtime showtime = inv.getShowtime();

            String movieTitle = null;
            String moviePosterUrl = null;
            if (showtime != null && showtime.getMovieId() != null) {
                Optional<Movie> movieOpt = movieRepository.findById(showtime.getMovieId());
                if (movieOpt.isPresent()) {
                    movieTitle = movieOpt.get().getTitle();
                    moviePosterUrl = movieOpt.get().getPosterUrl();
                }
            }

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

        // 4. LẤY THÔNG TIN COMBO (BẮP NƯỚC) TỪ INVOICE_COMBOS
        List<InvoiceCombo> invoiceCombos = invoiceComboRepository.findByInvoiceId(inv.getId());
        String comboDetails = null;

        if (invoiceCombos != null && !invoiceCombos.isEmpty()) {
            comboDetails = invoiceCombos.stream()
                    .map(ic -> ic.getQuantity() + "x " + ic.getCombo().getName())
                    .collect(java.util.stream.Collectors.joining(", "));
        }

        // 5. Trả về DTO
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
                .combos(comboDetails)
                .build();
    }
}
