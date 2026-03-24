package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.enums.SeatType;
import com.astracine.backend.core.service.SeatService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class SeatController {

    private final SeatService seatService;

    @PutMapping("/{id}/type")
    public ResponseEntity<?> updateSeatType(
            @PathVariable Long id,
            @RequestParam("type") String typeStr) {
        try {
            // Convert String (Frontend gửi lên) thành Enum
            SeatType newType = SeatType.valueOf(typeStr.toUpperCase());

            // Gọi Service xử lý
            seatService.updateSeatType(id, newType);

            return ResponseEntity.ok().body("Cập nhật ghế thành công!");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Loại ghế không hợp lệ: " + typeStr);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi Server: " + e.getMessage());
        }
    }
}