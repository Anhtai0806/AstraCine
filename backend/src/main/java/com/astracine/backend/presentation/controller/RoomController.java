package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.entity.Room;
import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.service.RoomService;
import com.astracine.backend.presentation.dto.RoomDTO;

import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/rooms")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class RoomController {

    private final RoomService roomService;

    /**
     * Tạo phòng mới
     * POST /api/rooms
     * Body: { "name": "Rap 1", "totalRows": 10, "totalColumns": 12 }
     */
    @PostMapping
    // Sử dụng RoomDTO.CreateRequest rất rõ ràng
    public ResponseEntity<Room> createRoom(@Valid @RequestBody RoomDTO.CreateRequest request) {
        Room room = roomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(room);
    }

    /**
     * Lấy danh sách phòng
     * GET /api/rooms
     */
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    /**
     * Lấy danh sách ghế của 1 phòng (Dùng cho Admin xem/sửa)
     * GET /api/rooms/{id}/seats
     */
    @GetMapping("/{id}/seats")
    public ResponseEntity<List<Seat>> getRoomSeats(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomSeats(id));
    }

    /**
     * Lấy chi tiết phòng
     * GET /api/rooms/{id}
     */

    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

}