package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.entity.Ticket;
import com.astracine.backend.core.entity.InvoiceCombo; // 👉 Nhớ import thêm cái này
import com.astracine.backend.presentation.dto.staff.StaffCheckInRequest;
import com.astracine.backend.presentation.dto.staff.StaffTicketVerificationRequest;
import com.astracine.backend.presentation.dto.staff.StaffTicketVerificationResponse;
import com.astracine.backend.core.repository.TicketRepository;
import com.astracine.backend.core.repository.InvoiceComboRepository;
import com.astracine.backend.core.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors; // 👉 Import Stream để nối chuỗi bắp nước

@Service
@RequiredArgsConstructor
public class StaffTicketService {

    private final TicketRepository ticketRepository;
    private final MovieRepository movieRepository;
    private final InvoiceComboRepository invoiceComboRepository;

    @Transactional
    public List<StaffTicketVerificationResponse> verifyTicket(StaffTicketVerificationRequest request) {

        List<StaffTicketVerificationResponse> responses = new ArrayList<>();

        // 1. Tìm tất cả các vé có chung mã QR này
        List<Ticket> tickets = ticketRepository.findByQrCode(request.getQrCode());

        if (tickets == null || tickets.isEmpty()) {
            responses.add(StaffTicketVerificationResponse.builder()
                    .canCheckIn(false)
                    .message("❌ LỖI: Mã QR không tồn tại trong hệ thống!")
                    .build());
            return responses;
        }

        // ==============================================================
        // 🔥 TRUY VẤN TÊN PHIM 1 LẦN DUY NHẤT (Tránh N+1 Query)
        // ==============================================================
        Showtime commonShowtime = tickets.get(0).getShowtimeSeat().getShowtime();
        String movieTitle = "Không xác định";
        if (commonShowtime != null && commonShowtime.getMovieId() != null) {
            Optional<Movie> movieOpt = movieRepository.findById(commonShowtime.getMovieId());
            if (movieOpt.isPresent()) {
                movieTitle = movieOpt.get().getTitle();
            }
        }

        // ==============================================================
        // 🍿 TRUY VẤN THÔNG TIN BẮP NƯỚC 1 LẦN DUY NHẤT
        // ==============================================================
        Long invoiceId = tickets.get(0).getInvoice().getId();
        List<InvoiceCombo> invoiceCombos = invoiceComboRepository.findByInvoiceId(invoiceId);

        List<StaffTicketVerificationResponse.ComboPickupItem> comboItems = null;
        if (invoiceCombos != null && !invoiceCombos.isEmpty()) {
            comboItems = invoiceCombos.stream()
                    .map(ic -> StaffTicketVerificationResponse.ComboPickupItem.builder()
                            .id(ic.getId())
                            .comboName(ic.getCombo().getName())
                            .quantity(ic.getQuantity())
                            .isPickedUp(ic.getIsPickedUp() != null ? ic.getIsPickedUp() : false)
                            .build())
                    .collect(Collectors.toList());
        }

        LocalDateTime now = LocalDateTime.now(); // Lấy giờ hiện tại của máy chủ để so sánh

        // 2. DUYỆT QUA TỪNG GHẾ (TICKET) ĐỂ KIỂM TRA
        for (Ticket ticket : tickets) {
            Showtime showtime = ticket.getShowtimeSeat().getShowtime();
            Seat seat = ticket.getShowtimeSeat().getSeat();

            // Chuẩn bị thông tin phản hồi cho từng ghế
            StaffTicketVerificationResponse response = StaffTicketVerificationResponse.builder()
                    .ticketId(ticket.getId())
                    .invoiceId(ticket.getInvoice().getId())
                    .ticketCode(ticket.getQrCode())
                    .ticketStatus(ticket.getStatus())
                    .movieTitle(movieTitle)
                    .roomName(showtime.getRoom().getName())
                    .startTime(showtime.getStartTime())
                    .endTime(showtime.getEndTime())
                    .seatCode(seat.getRowLabel() + seat.getColumnNumber()) // VD: "D8"
                    .seatType(seat.getSeatType() != null ? seat.getSeatType().name() : "")
                    .customerDisplay(ticket.getInvoice().getCustomerUsername())
                    .comboItems(comboItems) // 👉 GẮN BIẾN COMBO DẠNG LIST VÀO DTO Ở ĐÂY
                    .build();

            // KỊCH BẢN 2: KIỂM TRA TRẠNG THÁI VÀ THỜI GIAN
            if ("VALID".equalsIgnoreCase(ticket.getStatus())) {

                LocalDateTime startTime = showtime.getStartTime();
                LocalDateTime endTime = showtime.getEndTime();

                // Chặn khách đi nhầm ngày, nhầm giờ
                if (now.isBefore(startTime.minusMinutes(45))) {
                    // Chưa đến giờ (Đến quá sớm trước 45p)
                    response.setCanCheckIn(false);
                    response.setMessage("⏳ Chưa đến giờ (Chỉ được vào rạp trước 45 phút)!");
                } else if (now.isAfter(endTime)) {
                    // Phim đã chiếu xong
                    response.setCanCheckIn(false);
                    response.setMessage("❌ Suất chiếu này đã kết thúc!");
                } else {
                    // Đúng giờ vàng
                    response.setCanCheckIn(true);
                    response.setMessage("✅ Hợp lệ. Có thể check-in!");
                }

            } else if ("USED".equalsIgnoreCase(ticket.getStatus())) {
                response.setCanCheckIn(false);
                response.setMessage("Vé này đã được soát trước đó!");
            } else {
                response.setCanCheckIn(false);
                response.setMessage("❌ LỖI: Vé này đã bị hủy!");
            }

            responses.add(response);
        }

        return responses;
    }

    @Transactional
    public String confirmCheckIn(StaffCheckInRequest request) {
        if (request.getTicketIds() == null || request.getTicketIds().isEmpty()) {
            return "Không có vé nào được chọn!";
        }

        // Lấy danh sách các vé mà nhân viên vừa tick chọn
        List<Ticket> ticketsToCheckIn = ticketRepository.findAllById(request.getTicketIds());

        int count = 0;
        for (Ticket t : ticketsToCheckIn) {
            // Chỉ những vé đang VALID mới được đổi sang USED (Đề phòng lách luật gọi API)
            if ("VALID".equalsIgnoreCase(t.getStatus())) {
                t.setStatus("USED");
                count++;
            }
        }

        // Lưu đồng loạt xuống DB
        ticketRepository.saveAll(ticketsToCheckIn);

        return "✅ Check-in thành công cho " + count + " khách hàng!";
    }

    @Transactional
    public String confirmComboPickup(List<Long> invoiceComboIds) {
        if (invoiceComboIds == null || invoiceComboIds.isEmpty()) {
            return "Không có combo nào được chọn!";
        }

        List<InvoiceCombo> combosToPickup = invoiceComboRepository.findAllById(invoiceComboIds);
        int count = 0;

        for (InvoiceCombo ic : combosToPickup) {
            if (Boolean.FALSE.equals(ic.getIsPickedUp()) || ic.getIsPickedUp() == null) {
                ic.setIsPickedUp(true);
                count++;
            }
        }

        invoiceComboRepository.saveAll(combosToPickup);
        return "✅ Giao thành công " + count + " loại combo!";
    }
}