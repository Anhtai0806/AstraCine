package com.astracine.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.astracine.backend.enums.ShowtimeStatus;
import java.time.LocalDateTime;
    @Entity
    @Table(name = "showtimes")
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public class Showtime {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "movie_id", nullable = false)
        private Long movieId;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "room_id", nullable = false)
        private Room room;

        // thêm cột mới time slot_id
         
         @Column(name = "time_slot_id")
         private Long timeSlotId;

        @Column(name = "start_time", nullable = false)
        private LocalDateTime startTime;

        @Column(name = "end_time", nullable = false)
        private LocalDateTime endTime;

        @Column(length = 20)
        private ShowtimeStatus status = ShowtimeStatus.OPEN;
    
      public Showtime(Long movieId, Room room, Long timeSlotId, LocalDateTime startTime, LocalDateTime endTime) {
        this.movieId = movieId;
        this.room = room;          // Nhận Object Room
        this.timeSlotId = timeSlotId; // Nhận ID TimeSlot
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = ShowtimeStatus.OPEN; // Mặc định trạng thái là OPEN
    }
   
    }




