package com.astracine.backend.controller;

import com.astracine.backend.dto.ShowtimeDTO; // Import DTO gom nhóm
import com.astracine.backend.entity.Showtime;
import com.astracine.backend.service.ShowtimeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    /**
     * Tạo suất chiếu mới
     * POST /api/showtimes
     */
    @PostMapping
    // Sử dụng ShowtimeDTO.CreateRequest
    public ResponseEntity<Showtime> createShowtime(@Valid @RequestBody ShowtimeDTO.CreateRequest request) {
        Showtime showtime = showtimeService.createShowtime(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(showtime);
    }

    /**
     * Lấy sơ đồ ghế để bán vé
     * GET /api/showtimes/{id}/seats
     * Trả về: ShowtimeDTO.SeatMapResponse (cấu trúc lồng nhau)
     */
    @GetMapping("/{id}/seats")
    public ResponseEntity<ShowtimeDTO.SeatMapResponse> getSeatMap(@PathVariable Long id) {
        return ResponseEntity.ok(showtimeService.getSeatMap(id));
    }

    @GetMapping
    public ResponseEntity<List<Showtime>> getAllShowtimes() {
        return ResponseEntity.ok(showtimeService.getAllShowtimes());
    }
}