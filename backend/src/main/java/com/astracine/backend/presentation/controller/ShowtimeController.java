package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.service.ShowtimeService;
import com.astracine.backend.presentation.dto.ShowtimeDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/showtimes")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    @PostMapping
    public ResponseEntity<ShowtimeDTO.ManualCreateResponse> createShowtime(
            @Valid @RequestBody ShowtimeDTO.CreateRequest request) {
        ShowtimeDTO.ManualCreateResponse response = showtimeService.createShowtime(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/generate")
    public ResponseEntity<ShowtimeDTO.GenerateResponse> generateShowtimes(
            @Valid @RequestBody ShowtimeDTO.GenerateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(showtimeService.generateShowtimes(request));
    }

    @PostMapping("/generate/preview")
    public ResponseEntity<ShowtimeDTO.GenerateResponse> previewGenerateShowtimes(
            @Valid @RequestBody ShowtimeDTO.GenerateRequest request) {
        return ResponseEntity.ok(showtimeService.previewGenerateShowtimes(request));
    }

    @PostMapping("/generate/confirm")
    public ResponseEntity<ShowtimeDTO.GenerateResponse> confirmGeneratedShowtimes(
            @Valid @RequestBody ShowtimeDTO.ConfirmGenerateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(showtimeService.confirmGeneratedShowtimes(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShowtimeDTO.ManualCreateResponse> updateShowtime(
            @PathVariable Long id,
            @Valid @RequestBody ShowtimeDTO.CreateRequest request) {
        return ResponseEntity.ok(showtimeService.updateShowtime(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShowtime(@PathVariable Long id) {
        showtimeService.deleteShowtime(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteShowtimesByDate(@RequestParam LocalDate scheduleDate) {
        showtimeService.deleteShowtimesByDate(scheduleDate);
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
