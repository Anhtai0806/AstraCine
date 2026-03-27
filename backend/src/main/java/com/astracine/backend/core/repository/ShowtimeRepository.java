package com.astracine.backend.core.repository;

import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.enums.ShowtimeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

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

        // Kiểm tra trùng lịch khi CẬP NHẬT suất chiếu (loại trừ chính nó)
        @Query("SELECT s FROM Showtime s " +
                        "WHERE s.room.id = :roomId " +
                        "AND s.id <> :showtimeId " +
                        "AND s.status <> :excludedStatus " +
                        "AND (s.startTime < :endTime AND s.endTime > :startTime)")
        List<Showtime> findOverlappingExcludingId(@Param("roomId") Long roomId,
                        @Param("showtimeId") Long showtimeId,
                        @Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime,
                        @Param("excludedStatus") ShowtimeStatus excludedStatus);

        // Lấy danh sách suất chiếu trong phòng (trừ đã hủy), sắp theo giờ bắt đầu
        List<Showtime> findByRoom_IdAndStatusNotOrderByStartTimeAsc(Long roomId, ShowtimeStatus status);
}
