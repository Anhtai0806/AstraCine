package com.astracine.backend.repository;

import com.astracine.backend.entity.ShowtimeSeat;
import com.astracine.backend.enums.SeatBookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {

    @Query("select ss.seat.id from ShowtimeSeat ss where ss.showtime.id = :showtimeId and ss.status = :status")
    List<Long> findSeatIdsByShowtimeAndStatus(@Param("showtimeId") Long showtimeId,
                                              @Param("status") SeatBookingStatus status);

    Optional<ShowtimeSeat> findByShowtimeIdAndSeatId(Long showtimeId, Long seatId);
}
