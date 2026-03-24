package com.astracine.backend.presentation.dto.ws;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

import com.astracine.backend.core.enums.SeatEventType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatEventDto {
    private SeatEventType type;
    private Long showtimeId;
    private List<Long> seatIds;
    private String holdId;
    private String byUserId;
    /** epoch millis */
    private Long expiresAt;
}
