package com.astracine.backend.dto.ws;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
