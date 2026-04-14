package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.entity.Room;
import com.astracine.backend.core.service.RoomService;
import com.astracine.backend.presentation.dto.RoomDTO;
import com.astracine.backend.presentation.dto.SeatResponseDTO;

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

    // ===================== TẠO PHÒNG =====================

    /**
     * POST /api/admin/rooms
     * Body: { "name": "Rap 1", "totalRows": 10, "totalColumns": 12, "screenType": "2D" }
     */
    @PostMapping
    public ResponseEntity<Room> createRoom(@Valid @RequestBody RoomDTO.CreateRequest request) {
        Room room = roomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(room);
    }

    // ===================== CẬP NHẬT =====================

    /**
     * PUT /api/admin/rooms/{id}
     * Body: { "name": "Rạp 1 - IMAX", "screenType": "IMAX" }
     * Chỉ cho phép sửa name + screenType, KHÔNG sửa rows/columns
     */
    @PutMapping("/{id}")
    public ResponseEntity<Room> updateRoom(
            @PathVariable Long id,
            @Valid @RequestBody RoomDTO.UpdateRequest request) {
        Room room = roomService.updateRoom(id, request);
        return ResponseEntity.ok(room);
    }

    // ===================== TRẠNG THÁI =====================

    /**
     * PATCH /api/admin/rooms/{id}/deactivate
     * Ngưng hoạt động phòng (Soft Delete)
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Room> deactivateRoom(@PathVariable Long id) {
        Room room = roomService.deactivateRoom(id);
        return ResponseEntity.ok(room);
    }

    /**
     * PATCH /api/admin/rooms/{id}/activate
     * Kích hoạt lại phòng
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<Room> activateRoom(@PathVariable Long id) {
        Room room = roomService.activateRoom(id);
        return ResponseEntity.ok(room);
    }

    // ===================== XÓA =====================

    /**
     * DELETE /api/admin/rooms/{id}
     * Xóa vĩnh viễn (chỉ khi phòng chưa từng có suất chiếu)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> hardDeleteRoom(@PathVariable Long id) {
        roomService.hardDeleteRoom(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== TRUY VẤN =====================

    /** GET /api/admin/rooms - Lấy tất cả phòng (Admin) */
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    /** GET /api/admin/rooms/active - Chỉ phòng ACTIVE (dùng cho Showtime dropdown) */
    @GetMapping("/active")
    public ResponseEntity<List<Room>> getActiveRooms() {
        return ResponseEntity.ok(roomService.getActiveRooms());
    }

    /** GET /api/admin/rooms/{id} - Chi tiết phòng */
    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    /** GET /api/admin/rooms/{id}/seats - Ghế của phòng */
    @GetMapping("/{id}/seats")
    public ResponseEntity<List<SeatResponseDTO>> getRoomSeats(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomSeats(id));
    }
}