package com.astracine.backend.dto.seat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatStateDto {
    private Long seatId;
    private String rowLabel;
    private Integer columnNumber;
    private String seatType;

    private SeatDisplayStatus status;

    /** epoch millis - chỉ có khi status=HELD */
    private Long heldExpiresAt;
}
