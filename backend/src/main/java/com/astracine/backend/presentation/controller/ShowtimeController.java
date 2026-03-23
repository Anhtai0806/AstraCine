package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.service.ShowtimeService;
import com.astracine.backend.presentation.dto.ShowtimeDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/showtimes")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    @PostMapping
    public ResponseEntity<Showtime> createShowtime(@Valid @RequestBody ShowtimeDTO.CreateRequest request) {
        Showtime showtime = showtimeService.createShowtime(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(showtime);
    }

    @PostMapping("/generate")
    public ResponseEntity<ShowtimeDTO.GenerateResponse> generateShowtimes(
            @Valid @RequestBody ShowtimeDTO.GenerateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(showtimeService.generateShowtimes(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Showtime> updateShowtime(@PathVariable Long id,
                                                   @Valid @RequestBody ShowtimeDTO.CreateRequest request) {
        return ResponseEntity.ok(showtimeService.updateShowtime(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShowtime(@PathVariable Long id) {
        showtimeService.deleteShowtime(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/seats")
    public ResponseEntity<ShowtimeDTO.SeatMapResponse> getSeatMap(@PathVariable Long id) {
        return ResponseEntity.ok(showtimeService.getSeatMap(id));
    }

    @GetMapping
    public ResponseEntity<List<ShowtimeDTO.Response>> getAllShowtimes() {
        return ResponseEntity.ok(showtimeService.getAllShowtimes());
    }
}
