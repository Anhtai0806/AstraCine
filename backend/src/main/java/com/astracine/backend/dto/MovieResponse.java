package com.astracine.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieResponse {
    private Long id;
    private String title;
    private String description;
    private Integer durationMinutes;
    private LocalDate releaseDate;
    private LocalDate endDate;
    private String ageRating;
    private String status;
    private String posterUrl;
    private String trailerUrl;
    private LocalDateTime createdAt;
    private Set<GenreDTO> genres;
}
