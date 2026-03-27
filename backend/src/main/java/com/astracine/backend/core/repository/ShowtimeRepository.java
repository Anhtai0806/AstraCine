package com.astracine.backend.core.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.enums.ShowtimeStatus;

import java.time.LocalDateTime;
import java.util.List;

// Kiểm tra xem có suất chiếu nào đè lên khung giờ này không
// Trừ những suất đã bị HỦY (CANCELLED)
@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

        @Query("SELECT s FROM Showtime s " +
                        "WHERE s.room.id = :roomId " +
                        "AND s.status <> :excludedStatus " + // ✅ Sửa thành tham số
                        "AND (s.startTime < :endTime AND s.endTime > :startTime)")
        List<Showtime> findOverlapping(@Param("roomId") Long roomId,
                        @Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime,
                        @Param("excludedStatus") ShowtimeStatus excludedStatus); // ✅ Thêm tham số

        // Kiểm tra phòng có suất chiếu TƯƠNG LAI không (dùng cho Deactivate)
        boolean existsByRoomIdAndStartTimeAfter(Long roomId, LocalDateTime time);

        // Kiểm tra phòng ĐÃ TỪNG có suất chiếu nào chưa (dùng cho Hard Delete)
        boolean existsByRoomId(Long roomId);
}