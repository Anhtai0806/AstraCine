package com.astracine.backend.service;

import com.astracine.backend.dto.RoomDTO; // Chỉ cần import 1 file DTO này
import com.astracine.backend.entity.Room;
import com.astracine.backend.entity.Seat;
import com.astracine.backend.enums.SeatType;
import com.astracine.backend.repository.RoomRepository;
import com.astracine.backend.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;

    /**
     * Tạo phòng chiếu mới và tự động sinh ghế
     * @param request DTO chứa thông tin tạo phòng
     */
    public Room createRoom(RoomDTO.CreateRequest request) {
        // 1. Tạo entity Room từ DTO
        Room room = new Room(
            request.getName(),
            request.getTotalRows(),
            request.getTotalColumns()
        );
        room = roomRepository.save(room);

        // 2. Sinh ghế tự động theo logic ma trận
        List<Seat> seats = generateSeats(room);
        seatRepository.saveAll(seats);

        return room;
    }

    /**
     * Logic sinh ghế: Gán loại ghế (VIP/COUPLE) dựa vào vị trí hàng/cột
     */
    private List<Seat> generateSeats(Room room) {
        List<Seat> seats = new ArrayList<>();
        int rows = room.getTotalRows();
        int cols = room.getTotalColumns();

        for (int i = 0; i < rows; i++) {
            String rowLabel = String.valueOf((char) ('A' + i)); // 0 -> A, 1 -> B...

            for (int j = 0; j < cols; j++) {
                // Logic nghiệp vụ: Xác định loại ghế
                SeatType type = determineSeatType(i, j, rows, cols);
                BigDecimal basePrice = new BigDecimal(type.getBasePrice());

                Seat seat = new Seat(
                    room.getId(),
                    rowLabel,
                    j + 1, // Cột bắt đầu từ 1
                    type,
                    basePrice
                );
                seats.add(seat);
            }
        }
        return seats;
    }

    private SeatType determineSeatType(int row, int col, int totalRows, int totalCols) {
        if (row >= totalRows - 2) return SeatType.VIP; // 2 hàng cuối là VIP
        if (row == 0 && col >= totalCols/3 && col < 2*totalCols/3) return SeatType.COUPLE; // Giữa hàng đầu là Couple
        if (row >= totalRows/3 && row < 2*totalRows/3 && col >= totalCols/3 && col < 2*totalCols/3) return SeatType.PREMIUM; // Vùng trung tâm
        return SeatType.NORMAL;
    }

    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng với ID: " + id));
    }

    @Transactional(readOnly = true)
    public List<Seat> getRoomSeats(Long roomId) {
        return seatRepository.findByRoomIdOrderByRowLabelAscColumnNumberAsc(roomId);
    }
}
