package com.astracine.backend.controller;

import com.astracine.backend.dto.seat.SeatStateDto;
import com.astracine.backend.service.SeatHoldService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/showtimes")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class ShowtimeSeatController {

    private final SeatHoldService seatHoldService;

    public ShowtimeSeatController(SeatHoldService seatHoldService) {
        this.seatHoldService = seatHoldService;
    }

    @GetMapping("/{showtimeId}/seats")
    public ResponseEntity<List<SeatStateDto>> getSeatStates(@PathVariable Long showtimeId) {
        return ResponseEntity.ok(seatHoldService.getSeatStates(showtimeId));
    }
}
