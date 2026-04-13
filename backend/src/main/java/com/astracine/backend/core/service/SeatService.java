package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.enums.SeatType;
import com.astracine.backend.core.repository.SeatRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeatService {

    private final SeatRepository seatRepository;

    @Transactional
    public void updateSeatType(Long seatId, SeatType newType) {
        // 1. Tìm ghế trong DB
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế ID: " + seatId));

        // 2. Validate không cho đổi qua lại giữa ghế đơn và ghế đôi
        if (seat.getSeatType() == SeatType.COUPLE && newType != SeatType.COUPLE) {
            throw new RuntimeException("Không thể chuyển đổi ghế đôi sang loại ghế khác.");
        }
        if (seat.getSeatType() != SeatType.COUPLE && newType == SeatType.COUPLE) {
            throw new RuntimeException("Không thể chuyển đổi ghế đơn sang ghế đôi.");
        }

        // 3. Cập nhật loại ghế mới
        seat.setSeatType(newType);

        // 4. Lưu xuống DB
        seatRepository.save(seat);
    }
}