package com.astracine.backend.presentation.dto.chat;

import java.util.List;

import com.astracine.backend.presentation.dto.invoice.ETicketDTO;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import com.astracine.backend.presentation.dto.payment.PayOSCreateResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponse {
    private String reply;
    private boolean usedAi;
    private String source;
    private List<ChatMovieSuggestionDTO> suggestedMovies;
    private List<ChatShowtimeSuggestionDTO> suggestedShowtimes;
    private String sessionId;
    private ChatBookingStateDTO bookingState;
    private List<ComboCartItemDTO> suggestedCombos;
    private PayOSCreateResponse payment;
    private ETicketDTO ticket;
}
