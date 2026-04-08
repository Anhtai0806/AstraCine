package com.astracine.backend.presentation.dto.movie;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import com.astracine.backend.core.enums.MovieStatus;

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
    private MovieStatus status;
    /** Độ ưu tiên (độ hot) của phim — từ 1 (ít phổ biến) đến 5 (siêu hot). */
    private Integer priority;
    private String posterUrl;
    private String trailerUrl;
    private LocalDateTime createdAt;
    private Set<GenreDTO> genres;
}
