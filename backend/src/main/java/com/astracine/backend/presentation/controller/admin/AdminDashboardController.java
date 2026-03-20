package com.astracine.backend.presentation.controller.admin;

import com.astracine.backend.core.service.AdminDashboardService;
import com.astracine.backend.presentation.dto.dashboard.AdminDashboardDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<AdminDashboardDTO> getStatistics(@RequestParam(defaultValue = "day") String chartType) {
        return ResponseEntity.ok(adminDashboardService.getDashboardStatistics(chartType));
    }
}
