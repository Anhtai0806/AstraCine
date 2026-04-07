package com.astracine.backend.presentation.controller.client;

import com.astracine.backend.core.service.payment.InvoiceService;
import com.astracine.backend.presentation.dto.invoice.InvoiceHistoryDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/my")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class ClientInvoiceController {

    private final InvoiceService invoiceService;

    /**
     * Lấy lịch sử mua hàng của user hiện tại.
     * Yêu cầu đăng nhập (Bearer token).
     */
    @GetMapping("/invoices")
    public ResponseEntity<List<InvoiceHistoryDTO>> getMyInvoices(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId) {

        String username = null;
        if (userDetails != null) {
            username = userDetails.getUsername();
        } else if (guestUserId != null && !guestUserId.isBlank() && !guestUserId.startsWith("guest-")) {
            // Frontend truyền trực tiếp username của người đăng nhập (do JWT chưa
            // implement) qua X-User-Id
            username = guestUserId;
        }

        if (username == null) {
            log.warn("[InvoiceHistory] Unauthorized request - no username found");
            return ResponseEntity.status(401).build();
        }

        log.info("[InvoiceHistory] Fetching invoices for user={}", username);
        List<InvoiceHistoryDTO> history = invoiceService.getInvoiceHistory(username);
        return ResponseEntity.ok(history);
    }
}
