package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.enums.SeatStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    // Tìm ghế theo phòng và trạng thái (VD: lấy ghế đang ACTIVE)
    List<Seat> findByRoomIdAndStatus(Long roomId, SeatStatus status);

    // Tìm tất cả ghế của phòng, sắp xếp theo Hàng (A, B...) rồi đến Số (1, 2...)
    // JPA sẽ tự động dịch tên hàm này thành câu lệnh SQL ORDER BY
    List<Seat> findByRoomIdOrderByRowLabelAscColumnNumberAsc(Long roomId);

    List<Seat> findByRoomId(Long roomId);

    void deleteByRoomId(Long roomId);
}