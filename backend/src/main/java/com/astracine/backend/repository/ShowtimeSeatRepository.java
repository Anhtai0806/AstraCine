package com.astracine.backend.repository;

import com.astracine.backend.entity.ShowtimeSeat;
import com.astracine.backend.enums.SeatBookingStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {
    
    // Lấy danh sách ghế của suất chiếu
    List<ShowtimeSeat> findByShowtimeId(Long showtimeId);

    // TỐI ƯU: Thay thế @Query bằng tên hàm chuẩn JPA
    // Tác dụng: Tìm theo showtimeId và sắp xếp theo seatId tăng dần
    List<ShowtimeSeat> findByShowtimeIdOrderBySeatIdAsc(Long showtimeId);

    @Query("select ss.seat.id from ShowtimeSeat ss where ss.showtime.id = :showtimeId and ss.status = :status")
    List<Long> findSeatIdsByShowtimeAndStatus(@Param("showtimeId") Long showtimeId,
                                              @Param("status") SeatBookingStatus status);

    Optional<ShowtimeSeat> findByShowtimeIdAndSeatId(Long showtimeId, Long seatId);
                                          
}
