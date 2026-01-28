package com.astracine.backend.service;

import com.astracine.backend.entity.Seat;
import com.astracine.backend.enums.SeatType;
import com.astracine.backend.repository.SeatRepository;
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

        // 2. Cập nhật loại ghế mới
        seat.setSeatType(newType);

        // 3. ✅ TỰ ĐỘNG CẬP NHẬT GIÁ (Lấy từ Enum SeatType)
        // newType.getBasePrice() trả về int (ví dụ 80000) -> Convert sang BigDecimal
        seat.setBasePrice(BigDecimal.valueOf(newType.getBasePrice()));

        // 4. Lưu xuống DB
        seatRepository.save(seat);
    }
}