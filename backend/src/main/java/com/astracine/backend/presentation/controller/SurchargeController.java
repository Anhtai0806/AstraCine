package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.service.SurchargeService;
import com.astracine.backend.presentation.dto.HolidaySurchargeDTO;
import com.astracine.backend.presentation.dto.WeekendSurchargeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/surcharges")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SurchargeController {

    private final SurchargeService surchargeService;

    // ─── Weekend ─────────────────────────────────

    @GetMapping("/weekend")
    public ResponseEntity<WeekendSurchargeDTO> getWeekendConfig() {
        return ResponseEntity.ok(surchargeService.getWeekendConfig());
    }

    @PutMapping("/weekend")
    public ResponseEntity<WeekendSurchargeDTO> updateWeekendConfig(@RequestBody WeekendSurchargeDTO dto) {
        return ResponseEntity.ok(surchargeService.updateWeekendConfig(dto));
    }

    // ─── Holidays ────────────────────────────────

    @GetMapping("/holidays")
    public ResponseEntity<List<HolidaySurchargeDTO>> getAllHolidays() {
        return ResponseEntity.ok(surchargeService.getAllHolidays());
    }

    @PostMapping("/holidays")
    public ResponseEntity<HolidaySurchargeDTO> createHoliday(@RequestBody HolidaySurchargeDTO dto) {
        return ResponseEntity.ok(surchargeService.createHoliday(dto));
    }

    @PutMapping("/holidays/{id}")
    public ResponseEntity<HolidaySurchargeDTO> updateHoliday(@PathVariable Long id, @RequestBody HolidaySurchargeDTO dto) {
        return ResponseEntity.ok(surchargeService.updateHoliday(id, dto));
    }

    @PatchMapping("/holidays/{id}/toggle")
    public ResponseEntity<HolidaySurchargeDTO> toggleHoliday(@PathVariable Long id) {
        return ResponseEntity.ok(surchargeService.toggleHoliday(id));
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id) {
        surchargeService.deleteHoliday(id);
        return ResponseEntity.noContent().build();
    }
}
