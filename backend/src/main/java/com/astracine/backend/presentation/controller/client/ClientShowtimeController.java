package com.astracine.backend.presentation.controller.client;

import com.astracine.backend.core.service.showtime.ShowtimeService;
import com.astracine.backend.presentation.dto.ShowtimeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/showtimes")
@RequiredArgsConstructor
public class ClientShowtimeController {

    private final ShowtimeService showtimeService;

    @GetMapping
    public ResponseEntity<List<ShowtimeDTO.Response>> getAllShowtimes() {
        return ResponseEntity.ok(showtimeService.getAllShowtimes());
    }
}
