package com.astracine.backend.presentation.dto.chat;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String reply;
    private boolean usedAi;
    private String source;
    private List<ChatMovieSuggestionDTO> suggestedMovies;
    private List<ChatShowtimeSuggestionDTO> suggestedShowtimes;
}
