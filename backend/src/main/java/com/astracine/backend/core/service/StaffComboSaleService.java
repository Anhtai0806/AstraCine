package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Combo;
import com.astracine.backend.core.entity.Invoice;
import com.astracine.backend.core.entity.InvoiceCombo;
import com.astracine.backend.core.entity.Payment;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.ComboRepository;
import com.astracine.backend.core.repository.InvoiceComboRepository;
import com.astracine.backend.core.repository.InvoiceRepository;
import com.astracine.backend.core.repository.PaymentRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.staff.StaffComboSaleRequest;
import com.astracine.backend.presentation.dto.staff.StaffComboSaleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class StaffComboSaleService {

    private final UserRepository userRepository;
    private final ComboRepository comboRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceComboRepository invoiceComboRepository;
    private final PaymentRepository paymentRepository;

    @Transactional
    public StaffComboSaleResponse createComboOnlySale(String staffUsername, StaffComboSaleRequest request) {
        User staff = userRepository.findByUsername(staffUsername)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản staff"));

        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());
        String customerUsername = normalizeNullable(request.getCustomerUsername());

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("Vui lòng chọn ít nhất 1 combo");
        }

        Invoice invoice = Invoice.builder()
                .showtime(null)
                .staffId(staff.getId())
                .customerUsername(customerUsername)
                .totalAmount(BigDecimal.ZERO)
                .status("PAID")
                .build();

        invoice = invoiceRepository.save(invoice);

        BigDecimal totalAmount = BigDecimal.ZERO;
        List<StaffComboSaleResponse.LineItem> responseItems = new ArrayList<>();

        for (StaffComboSaleRequest.Item item : request.getItems()) {
            if (item.getComboId() == null || item.getQuantity() == null || item.getQuantity() <= 0) {
                continue;
            }

            Combo combo = comboRepository.findById(item.getComboId())
                    .orElseThrow(() -> new RuntimeException("Combo không tồn tại: " + item.getComboId()));

            if (combo.getStatus() != null && !"ACTIVE".equalsIgnoreCase(combo.getStatus())) {
                throw new RuntimeException("Combo đã ngừng bán: " + combo.getName());
            }

            BigDecimal price = combo.getPrice() != null ? combo.getPrice() : BigDecimal.ZERO;
            BigDecimal subtotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));

            invoiceComboRepository.save(InvoiceCombo.builder()
                    .invoice(invoice)
                    .combo(combo)
                    .quantity(item.getQuantity())
                    .price(price)
                    .build());

            totalAmount = totalAmount.add(subtotal);

            responseItems.add(StaffComboSaleResponse.LineItem.builder()
                    .comboId(combo.getId())
                    .comboName(combo.getName())
                    .quantity(item.getQuantity())
                    .price(price)
                    .subtotal(subtotal)
                    .build());
        }

        if (responseItems.isEmpty()) {
            throw new RuntimeException("Không có combo hợp lệ để tạo hóa đơn");
        }

        invoice.setTotalAmount(totalAmount);
        invoice = invoiceRepository.save(invoice);

        paymentRepository.save(Payment.builder()
                .invoice(invoice)
                .paymentMethod(paymentMethod)
                .transactionCode("STAFF-COMBO-" + invoice.getId() + "-" + System.currentTimeMillis())
                .amount(totalAmount)
                .status("PAID")
                .build());

        return StaffComboSaleResponse.builder()
                .invoiceId(invoice.getId())
                .staffId(staff.getId())
                .staffUsername(staff.getUsername())
                .customerUsername(customerUsername)
                .paymentMethod(paymentMethod)
                .status(invoice.getStatus())
                .totalAmount(invoice.getTotalAmount())
                .createdAt(invoice.getCreatedAt())
                .items(responseItems)
                .build();
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null) {
            throw new RuntimeException("Thiếu phương thức thanh toán");
        }

        String normalized = paymentMethod.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("CASH") && !normalized.equals("CARD")) {
            throw new RuntimeException("Phương thức thanh toán chỉ hỗ trợ CASH hoặc CARD");
        }
        return normalized;
    }
}