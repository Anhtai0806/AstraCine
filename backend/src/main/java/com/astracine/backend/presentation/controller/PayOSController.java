package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.service.PayOSService;
import com.astracine.backend.presentation.dto.payment.PayOSCreateRequest;
import com.astracine.backend.presentation.dto.payment.PayOSCreateResponse;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payments/payos")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class PayOSController {

    private final PayOSService payOSService;

    public PayOSController(PayOSService payOSService) {
        this.payOSService = payOSService;
    }

    /**
     * Tạo PayOS payment link cho một hold đã có.
     * Frontend gọi endpoint này, nhận checkoutUrl và redirect user đến trang PayOS.
     */
    @PostMapping("/create")
    public ResponseEntity<PayOSCreateResponse> create(
            @Valid @RequestBody PayOSCreateRequest req,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId) {

        String userId = resolveUserId(user, guestUserId);
        PayOSCreateResponse response = payOSService.createPaymentLink(
                req.getHoldId(), userId, req.getReturnUrl(), req.getCancelUrl(),
                req.getAmount(), req.getPromotionCode(), req.getComboItems());
        return ResponseEntity.ok(response);
    }

    /**
     * Nhận webhook callback từ PayOS sau khi user hoàn tất thanh toán.
     * Endpoint này PHẢI public (không cần auth) để PayOS gọi được.
     * PayOS verify bằng HMAC-SHA256 signature trong payload.
     */
    /**
     * PayOS gửi raw JSON body. SDK v2 verify(Object) cần raw Map để tính checksum.
     * Endpoint này PHẢI public (không cần auth).
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> webhook(@RequestBody Map<String, Object> rawBody) {
        log.info("[PayOS] Webhook received: orderCode={}", rawBody.get("orderCode"));

        boolean processed = payOSService.handleWebhook(rawBody);
        if (processed) {
            return ResponseEntity.ok(Map.of("code", "00", "desc", "success"));
        } else {
            // PayOS yêu cầu luôn trả 200 OK để tránh retry vô hạn
            return ResponseEntity.ok(Map.of("code", "01", "desc", "failed"));
        }
    }

    /**
     * (Optional) Kiểm tra trạng thái payment theo orderCode — để FE polling.
     */
    @GetMapping("/status/{orderCode}")
    public ResponseEntity<Map<String, Object>> status(
            @PathVariable long orderCode,
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId) {

        // Trả về status thô (FE tự xử lý)
        // PayOSService có thể mở rộng thêm method này nếu cần
        return ResponseEntity.ok(
                Map.of("orderCode", orderCode, "message", "Dùng /api/orders/confirm để xác nhận sau khi thanh toán"));
    }

    // ---------------------
    private static String resolveUserId(UserDetails user, String guestUserId) {
        if (user != null)
            return user.getUsername();
        if (guestUserId != null && !guestUserId.isBlank())
            return guestUserId;
        return "anonymous";
    }
}
