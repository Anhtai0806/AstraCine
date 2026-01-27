package com.astracine.backend.entity;

import com.astracine.backend.enums.ShowtimeStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

        @Column(name = "start_time", nullable = false)
        private LocalDateTime startTime;

        @Column(name = "end_time", nullable = false)
        private LocalDateTime endTime;

        @Column(length = 20)
        private ShowtimeStatus status = ShowtimeStatus.OPEN;
    }


