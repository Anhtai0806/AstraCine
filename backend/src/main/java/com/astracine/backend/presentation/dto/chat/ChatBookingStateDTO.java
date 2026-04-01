package com.astracine.backend.presentation.dto.chat;

import java.time.LocalDateTime;
import java.util.List;

import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import com.astracine.backend.presentation.dto.seat.SeatStateDto;
import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatBookingStateDTO {
    private boolean active;
    private String stage;
    private Long movieId;
    private String movieTitle;
    private Long showtimeId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime showtimeStartTime;

    private List<String> seatCodes;
    private Integer totalColumns;
    private List<SeatStateDto> seatMap;
    private List<ComboCartItemDTO> comboItems;
    private Long totalAmount;
    private boolean awaitingConfirmation;
    private boolean awaitingPayment;
    private Long orderCode;
}
