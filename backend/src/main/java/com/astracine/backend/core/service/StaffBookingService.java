package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Invoice;
import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.entity.ShowtimeSeat;
import com.astracine.backend.core.entity.Ticket;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.InvoiceComboRepository;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.TicketRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.staff.StaffCounterBookingRequest;
import com.astracine.backend.presentation.dto.staff.StaffCounterBookingResponse;
import com.astracine.backend.presentation.dto.staff.StaffTicketVerificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class StaffBookingService {

    private final SeatHoldService seatHoldService;
    private final InvoiceService invoiceService;
    private final TicketRepository ticketRepository;
    private final InvoiceComboRepository invoiceComboRepository;
    private final MovieRepository movieRepository;
    private final QrCodeService qrCodeService;
    private final UserRepository userRepository;

    @Transactional
    public StaffCounterBookingResponse createCounterBooking(StaffCounterBookingRequest request, String staffUsername) {
        validateCounterPermission(staffUsername);

        SeatHoldService.HoldSnapshot holdSnapshot =
                seatHoldService.getHoldSnapshot(request.getHoldId(), staffUsername);

        Invoice invoice = invoiceService.createCounterInvoice(
                request.getHoldId(),
                staffUsername,
                request.getTotalAmount(),
                request.getPromotionCode(),
                request.getComboItems(),
                holdSnapshot.getShowtimeId(),
                holdSnapshot.getSeatIds(),
                request.getCustomerName(),
                request.getCustomerEmail(),
                request.getCustomerPhone(),
                normalizePaymentMethod(request.getPaymentMethod()));

        return toCounterBookingResponse(invoice, normalizePaymentMethod(request.getPaymentMethod()));
    }

    @Transactional(readOnly = true)
    public StaffTicketVerificationResponse lookupTicket(String ticketCode, String staffUsername) {
        validateCheckinPermission(staffUsername);

        Ticket ticket = findTicket(ticketCode);
        return buildVerificationResponse(ticket, resolveLookupMessage(ticket));
    }

    @Transactional
    public StaffTicketVerificationResponse checkInTicket(String ticketCode, String staffUsername) {
        validateCheckinPermission(staffUsername);

        Ticket ticket = findTicket(ticketCode);

        if (!canCheckIn(ticket)) {
            throw new RuntimeException(resolveLookupMessage(ticket));
        }

        ticket.setStatus("USED");
        ticketRepository.save(ticket);
        return buildVerificationResponse(ticket, "Soát vé thành công. Khách có thể vào rạp.");
    }

    private void validateCounterPermission(String staffUsername) {
        User staff = userRepository.findByUsername(staffUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản nhân viên."));

        String position = normalizePosition(staff.getStaffPosition());
        if (!"COUNTER".equals(position) && !"MULTI".equals(position)) {
            throw new RuntimeException("Bạn không có quyền bán vé tại quầy.");
        }
    }

    private void validateCheckinPermission(String staffUsername) {
        User staff = userRepository.findByUsername(staffUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản nhân viên."));

        String position = normalizePosition(staff.getStaffPosition());
        if (!"CHECKIN".equals(position) && !"MULTI".equals(position)) {
            throw new RuntimeException("Bạn không có quyền soát vé.");
        }
    }

    private String normalizePosition(String position) {
        return position == null ? "" : position.trim().toUpperCase(Locale.ROOT);
    }

    private Ticket findTicket(String ticketCode) {
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new RuntimeException("Mã vé/QR không được để trống.");
        }
        return ticketRepository.findByQrCode(ticketCode.trim())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé với mã QR đã cung cấp."));
    }

    private String normalizePaymentMethod(String paymentMethod) {
        String normalized = paymentMethod == null ? "CASH" : paymentMethod.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "CASH", "CARD" -> normalized;
            default -> throw new RuntimeException("Phương thức thanh toán không hợp lệ. Chỉ hỗ trợ CASH hoặc CARD.");
        };
    }

    private StaffCounterBookingResponse toCounterBookingResponse(Invoice invoice, String paymentMethod) {
        Showtime showtime = invoice.getShowtime();
        Movie movie = null;
        if (showtime != null && showtime.getMovieId() != null) {
            movie = movieRepository.findById(showtime.getMovieId()).orElse(null);
        }

        List<StaffCounterBookingResponse.TicketItem> ticketItems = ticketRepository.findByInvoiceId(invoice.getId())
                .stream()
                .map(ticket -> {
                    ShowtimeSeat showtimeSeat = ticket.getShowtimeSeat();
                    Seat seat = showtimeSeat != null ? showtimeSeat.getSeat() : null;
                    String seatCode = seat != null ? seat.getRowLabel() + seat.getColumnNumber() : "?";
                    String seatType = seat != null && seat.getSeatType() != null ? seat.getSeatType().name() : "";
                    return StaffCounterBookingResponse.TicketItem.builder()
                            .ticketId(ticket.getId())
                            .ticketCode(ticket.getQrCode())
                            .ticketStatus(ticket.getStatus())
                            .seatCode(seatCode)
                            .seatType(seatType)
                            .price(ticket.getPrice())
                            .qrImageBase64(qrCodeService.generateQrCodeBase64(ticket.getQrCode()))
                            .build();
                })
                .toList();

        List<StaffCounterBookingResponse.ComboItem> comboItems = invoiceComboRepository.findByInvoiceId(invoice.getId())
                .stream()
                .map(combo -> StaffCounterBookingResponse.ComboItem.builder()
                        .comboId(combo.getCombo() != null ? combo.getCombo().getId() : null)
                        .comboName(combo.getCombo() != null ? combo.getCombo().getName() : "Combo")
                        .quantity(combo.getQuantity())
                        .price(combo.getPrice())
                        .build())
                .toList();

        return StaffCounterBookingResponse.builder()
                .invoiceId(invoice.getId())
                .invoiceStatus(invoice.getStatus())
                .paymentMethod(paymentMethod)
                .totalAmount(invoice.getTotalAmount())
                .customerDisplay(
                        invoice.getCustomerUsername() != null && !invoice.getCustomerUsername().isBlank()
                                ? invoice.getCustomerUsername()
                                : "Khách lẻ"
                )
                .createdAt(invoice.getCreatedAt())
                .showtimeId(showtime != null ? showtime.getId() : null)
                .movieTitle(movie != null ? movie.getTitle() : null)
                .roomName(showtime != null && showtime.getRoom() != null ? showtime.getRoom().getName() : null)
                .startTime(showtime != null ? showtime.getStartTime() : null)
                .endTime(showtime != null ? showtime.getEndTime() : null)
                .combos(comboItems)
                .tickets(ticketItems)
                .build();
    }

    private StaffTicketVerificationResponse buildVerificationResponse(Ticket ticket, String message) {
        Invoice invoice = ticket.getInvoice();
        Showtime showtime = invoice != null ? invoice.getShowtime() : null;
        Movie movie = null;
        if (showtime != null && showtime.getMovieId() != null) {
            movie = movieRepository.findById(showtime.getMovieId()).orElse(null);
        }

        ShowtimeSeat showtimeSeat = ticket.getShowtimeSeat();
        Seat seat = showtimeSeat != null ? showtimeSeat.getSeat() : null;

        return StaffTicketVerificationResponse.builder()
                .ticketId(ticket.getId())
                .invoiceId(invoice != null ? invoice.getId() : null)
                .ticketCode(ticket.getQrCode())
                .ticketStatus(ticket.getStatus())
                .canCheckIn(canCheckIn(ticket))
                .message(message)
                .customerDisplay(
                        invoice != null && invoice.getCustomerUsername() != null && !invoice.getCustomerUsername().isBlank()
                                ? invoice.getCustomerUsername()
                                : "Khách lẻ"
                )
                .movieTitle(movie != null ? movie.getTitle() : null)
                .roomName(showtime != null && showtime.getRoom() != null ? showtime.getRoom().getName() : null)
                .startTime(showtime != null ? showtime.getStartTime() : null)
                .endTime(showtime != null ? showtime.getEndTime() : null)
                .seatCode(seat != null ? seat.getRowLabel() + seat.getColumnNumber() : "?")
                .seatType(seat != null && seat.getSeatType() != null ? seat.getSeatType().name() : "")
                .build();
    }

    private boolean canCheckIn(Ticket ticket) {
        return ticket != null
                && ticket.getInvoice() != null
                && "PAID".equalsIgnoreCase(ticket.getInvoice().getStatus())
                && "VALID".equalsIgnoreCase(ticket.getStatus());
    }

    private String resolveLookupMessage(Ticket ticket) {
        if (ticket.getInvoice() == null || !"PAID".equalsIgnoreCase(ticket.getInvoice().getStatus())) {
            return "Vé chưa được thanh toán hợp lệ hoặc hóa đơn không còn hiệu lực.";
        }
        if ("USED".equalsIgnoreCase(ticket.getStatus())) {
            return "Vé này đã được soát trước đó.";
        }
        if ("CANCELLED".equalsIgnoreCase(ticket.getStatus())) {
            return "Vé này đã bị hủy.";
        }
        return "Vé hợp lệ. Có thể soát vé cho khách.";
    }
}