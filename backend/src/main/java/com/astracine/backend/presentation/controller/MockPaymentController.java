package com.astracine.backend.controller;


import com.astracine.backend.service.QrCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/test-payment")
public class MockPaymentController {

    @Autowired
    private QrCodeService qrCodeService;

    // API này giả lập việc VNPay trả kết quả THÀNH CÔNG
    @PostMapping("/success/{invoiceId}")
    public ResponseEntity<?> simulatePaymentSuccess(@PathVariable Long invoiceId) {
        
        // 1. Giả lập logic: Update hóa đơn thành PAID (Bỏ qua gọi DB tạm thời)
        // 2. Tạo mã vé bảo mật ngẫu nhiên (Ví dụ: TKT-1-abc1234)
        String secureTicketCode = "TKT-" + invoiceId + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        
        // 3. Gọi Service biến mã vé thành ảnh QR
        String qrBase64 = qrCodeService.generateQrCodeBase64(secureTicketCode);

        // 4. Trả về cho ReactJS hiển thị
        Map<String, String> response = new HashMap<>();
        response.put("message", "Thanh toán thành công! Vé đã được xuất.");
        response.put("ticketCode", secureTicketCode);
        response.put("qrImage", qrBase64); // Chứa chuỗi ảnh

        return ResponseEntity.ok(response);
    }
}