package com.astracine.backend.controller;

import com.astracine.backend.dto.TimeSlotDTO;
import com.astracine.backend.service.TimeSlotService; // Import Class
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/time-slots")
@RequiredArgsConstructor
public class TimeSlotController {

    private final TimeSlotService timeSlotService; // 👈 Inject trực tiếp Class

    @GetMapping
    public ResponseEntity<List<TimeSlotDTO>> getAll() {
        return ResponseEntity.ok(timeSlotService.getAllTimeSlots());
    }

    @PostMapping
    public ResponseEntity<TimeSlotDTO> create(@RequestBody TimeSlotDTO dto) {
        return ResponseEntity.ok(timeSlotService.createTimeSlot(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        timeSlotService.deleteTimeSlot(id);
        return ResponseEntity.ok("Đã xóa TimeSlot thành công");
    }
}

