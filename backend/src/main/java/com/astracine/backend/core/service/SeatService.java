package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.enums.SeatType;
import com.astracine.backend.core.repository.SeatRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

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

        // 3. ✅ TỰ ĐỘNG CẬP NHẬT GIÁ (Lấy từ Enum SeatType)
        // newType.getBasePrice() trả về int (ví dụ 80000) -> Convert sang BigDecimal
        seat.setBasePrice(BigDecimal.valueOf(newType.getBasePrice()));

        // 4. Lưu xuống DB
        seatRepository.save(seat);

    }

    public void updateSeatPrice(Long seatId, BigDecimal newPrice) {
        // 1. Tìm ghế trong DB
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ghế ID: " + seatId));

        // 2. Cập nhật giá mới
        seat.setBasePrice(newPrice);

        // 3. Lưu xuống DB
        seatRepository.save(seat);
    }
}