package com.astracine.backend.repository;

import com.astracine.backend.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.astracine.backend.enums.ShowtimeStatus;
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
}