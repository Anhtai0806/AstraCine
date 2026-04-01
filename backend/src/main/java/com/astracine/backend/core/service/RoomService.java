package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Room;
import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.enums.RoomStatus;
import com.astracine.backend.core.enums.SeatType;
import com.astracine.backend.core.repository.RoomRepository;
import com.astracine.backend.core.repository.SeatRepository;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.presentation.dto.RoomDTO;
import com.astracine.backend.presentation.exception.RoomBusinessException;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;

    // ===================== TẠO PHÒNG =====================

    /**
     * Tạo phòng chiếu mới và tự động sinh ghế
     */
    public Room createRoom(RoomDTO.CreateRequest request) {
        Room room = new Room(
                request.getName(),
                request.getTotalRows(),
                request.getTotalColumns(),
                request.getScreenType(),
                request.getPriceMultiplier());
        room = roomRepository.save(room);

        List<Seat> seats = generateSeats(room);
        seatRepository.saveAll(seats);

        return room;
    }

    // ===================== CẬP NHẬT PHÒNG =====================

    /**
     * Cập nhật thông tin cơ bản: CHỈ name + screenType.
     * KHÔNG cho phép sửa totalRows/totalColumns (bảo vệ sơ đồ ghế đã bán vé).
     */
    public Room updateRoom(Long id, RoomDTO.UpdateRequest request) {
        Room room = findRoomOrThrow(id);
        room.setName(request.getName());
        room.setScreenType(request.getScreenType());
        if (request.getPriceMultiplier() != null) {
            room.setPriceMultiplier(request.getPriceMultiplier());
        }
        return roomRepository.save(room);
    }

    // ===================== NGƯNG HOẠT ĐỘNG (Soft Delete) =====================

    /**
     * Chuyển phòng sang trạng thái INACTIVE.
     * Điều kiện: Không có suất chiếu nào trong tương lai.
     */
    public Room deactivateRoom(Long id) {
        Room room = findRoomOrThrow(id);

        if (room.getStatus() == RoomStatus.INACTIVE) {
            throw new RuntimeException("Phòng này đã ở trạng thái Ngưng hoạt động.");
        }

        // Kiểm tra suất chiếu tương lai
        boolean hasFutureShowtimes = showtimeRepository
                .existsByRoomIdAndStartTimeAfter(id, LocalDateTime.now());

        if (hasFutureShowtimes) {
            throw new RoomBusinessException(
                    "ROOM_HAS_FUTURE_SHOWTIMES",
                    "Không thể ngưng hoạt động! Phòng này đang có lịch chiếu sắp tới. Vui lòng hủy lịch chiếu trước.");
        }

        room.setStatus(RoomStatus.INACTIVE);
        return roomRepository.save(room);
    }

    // ===================== KÍCH HOẠT LẠI =====================

    /**
     * Kích hoạt lại phòng đã ngưng hoạt động.
     */
    public Room activateRoom(Long id) {
        Room room = findRoomOrThrow(id);

        if (room.getStatus() == RoomStatus.ACTIVE) {
            throw new RuntimeException("Phòng này đã ở trạng thái Hoạt động.");
        }

        room.setStatus(RoomStatus.ACTIVE);
        return roomRepository.save(room);
    }

    // ===================== XÓA VĨNH VIỄN (Hard Delete) =====================

    /**
     * Xóa phòng chiếu + tất cả ghế thuộc phòng.
     * Điều kiện: Phòng CHƯA TỪNG có bất kỳ suất chiếu nào (quá khứ hay tương lai).
     */
    public void hardDeleteRoom(Long id) {
        Room room = findRoomOrThrow(id);

        // Kiểm tra lịch sử — bất kỳ suất chiếu nào đã từng tồn tại
        boolean hasAnyShowtime = showtimeRepository.existsByRoomId(id);

        if (hasAnyShowtime) {
            throw new RoomBusinessException(
                    "ROOM_HAS_HISTORY",
                    "Phòng này đã có lịch sử hoạt động. Không thể xóa vĩnh viễn. Vui lòng sử dụng tính năng 'Ngưng hoạt động'.");
        }

        // Cascade: Xóa tất cả ghế trước, rồi xóa phòng
        seatRepository.deleteByRoomId(id);
        roomRepository.delete(room);
    }

    // ===================== TRUY VẤN =====================

    /** Lấy tất cả phòng (Admin quản lý — bao gồm cả INACTIVE) */
    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    /** Lấy chỉ phòng ACTIVE (dùng cho dropdown tạo Suất chiếu) */
    @Transactional(readOnly = true)
    public List<Room> getActiveRooms() {
        return roomRepository.findByStatus(RoomStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public Room getRoomById(Long id) {
        return findRoomOrThrow(id);
    }

    @Transactional(readOnly = true)
    public List<Seat> getRoomSeats(Long roomId) {
        return seatRepository.findByRoomIdOrderByRowLabelAscColumnNumberAsc(roomId);
    }

    // ===================== HELPER METHODS =====================

    private Room findRoomOrThrow(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + id));
    }

    /**
     * Logic sinh ghế: Gán loại ghế (VIP/COUPLE) dựa vào vị trí hàng/cột
     */
    private List<Seat> generateSeats(Room room) {
        List<Seat> seats = new ArrayList<>();
        int rows = room.getTotalRows();
        int cols = room.getTotalColumns();

        for (int i = 0; i < rows; i++) {
            String rowLabel = String.valueOf((char) ('A' + i));

            for (int j = 0; j < cols; j++) {
                SeatType type = determineSeatType(i, j, rows, cols);
                BigDecimal basePrice = new BigDecimal(type.getBasePrice());

                Seat seat = new Seat(
                        room.getId(),
                        rowLabel,
                        j + 1,
                        type,
                        basePrice);
                seats.add(seat);
            }
        }
        return seats;
    }

    private SeatType determineSeatType(int row, int col, int totalRows, int totalCols) {
        if (row >= totalRows - 2)
            return SeatType.VIP;
        if (row == 0 && col >= totalCols / 3 && col < 2 * totalCols / 3)
            return SeatType.COUPLE;
        if (row >= totalRows / 3 && row < 2 * totalRows / 3 && col >= totalCols / 3 && col < 2 * totalCols / 3)
            return SeatType.PREMIUM;
        return SeatType.NORMAL;
    }
}
