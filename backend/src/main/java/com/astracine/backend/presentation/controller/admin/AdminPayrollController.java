package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.PayrollService;
import com.astracine.backend.presentation.dto.staff.PayrollDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/payroll")
@RequiredArgsConstructor
public class AdminPayrollController {

    private final PayrollService payrollService;

    @GetMapping("/summary")
    public ResponseEntity<PayrollDTO.PayrollSummaryResponse> getSummary(@RequestParam LocalDate fromDate,
                                                                        @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(payrollService.getPayrollSummary(fromDate, toDate));
    }

    @GetMapping("/staff/{staffId}")
    public ResponseEntity<PayrollDTO.PayrollStaffDetailResponse> getStaffPayroll(@PathVariable Long staffId,
                                                                                  @RequestParam LocalDate fromDate,
                                                                                  @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(payrollService.getPayrollForStaff(staffId, fromDate, toDate));
    }
}
