package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.payment.InvoiceService;
import com.astracine.backend.presentation.dto.invoice.InvoiceHistoryDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/invoices")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class AdminInvoiceController {

    private final InvoiceService invoiceService;

    /**
     * GET /api/admin/invoices
     * Lấy danh sách tất cả hóa đơn, hỗ trợ filter tuỳ chọn qua query params:
     * - search : tìm theo customerUsername (chứa, ignore case)
     * - status : PAID | CANCELLED | DRAFT
     * - from : từ ngày (yyyy-MM-dd)
     * - to : đến ngày (yyyy-MM-dd)
     */
    @GetMapping
    public ResponseEntity<List<InvoiceHistoryDTO>> getAllInvoices(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(23, 59, 59) : null;

        log.info("[AdminInvoice] GET all — search={} status={} from={} to={}", search, status, fromDt, toDt);

        List<InvoiceHistoryDTO> result = invoiceService.getAllInvoicesForAdmin(search, status, fromDt, toDt);
        return ResponseEntity.ok(result);
    }
}
