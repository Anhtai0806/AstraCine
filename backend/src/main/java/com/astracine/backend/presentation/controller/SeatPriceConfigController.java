package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.service.SeatPriceConfigService;
import com.astracine.backend.presentation.dto.SeatPriceConfigDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/seat-prices")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SeatPriceConfigController {

    private final SeatPriceConfigService seatPriceConfigService;

    @GetMapping
    public ResponseEntity<List<SeatPriceConfigDTO>> getAllPrices() {
        return ResponseEntity.ok(seatPriceConfigService.getAllConfigs());
    }

    @PutMapping
    public ResponseEntity<List<SeatPriceConfigDTO>> updatePrices(@RequestBody List<SeatPriceConfigDTO> prices) {
        return ResponseEntity.ok(seatPriceConfigService.updateConfigs(prices));
    }
}
