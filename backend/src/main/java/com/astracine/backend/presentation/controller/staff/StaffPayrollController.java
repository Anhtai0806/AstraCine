package com.astracine.backend.presentation.controller.staff;

import com.astracine.backend.core.service.PayrollService;
import com.astracine.backend.presentation.dto.staff.PayrollDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/staff/payroll")
@RequiredArgsConstructor
public class StaffPayrollController {

    private final PayrollService payrollService;

    @GetMapping("/my")
    public ResponseEntity<PayrollDTO.PayrollStaffDetailResponse> getMyPayroll(@RequestParam LocalDate fromDate,
                                                                              @RequestParam LocalDate toDate) {
        return ResponseEntity.ok(payrollService.getMyPayroll(fromDate, toDate));
    }
}
