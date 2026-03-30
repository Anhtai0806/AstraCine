package com.astracine.backend.presentation.dto.chat;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMovieSuggestionDTO {
    private Long id;
    private String title;
    private String description;
    private Integer durationMinutes;
    private String ageRating;
    private String status;
    private LocalDate releaseDate;
    private LocalDate endDate;
    private List<String> genres;
    private String posterUrl;
    private Integer relevanceScore;
}
