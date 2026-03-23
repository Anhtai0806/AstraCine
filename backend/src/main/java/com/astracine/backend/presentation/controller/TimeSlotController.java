package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.service.TimeSlotService;
import com.astracine.backend.presentation.dto.TimeSlotDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/time-slots")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
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

    @PutMapping("/{id}")
    public ResponseEntity<TimeSlotDTO> update(@PathVariable Long id, @RequestBody TimeSlotDTO dto) {
        return ResponseEntity.ok(timeSlotService.updateTimeSlot(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        timeSlotService.deleteTimeSlot(id);
        return ResponseEntity.ok("Đã xóa TimeSlot thành công");
    }
}
