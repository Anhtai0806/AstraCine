package com.astracine.backend.dto.seat;

import com.astracine.backend.enums.SeatBookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.astracine.backend.enums.SeatType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatStateDto {
    private Long seatId;
    private String rowLabel;
    private Integer columnNumber;
    private SeatType seatType;

    private SeatBookingStatus status;

    /** epoch millis - chỉ có khi status=HELD */
    private Long heldExpiresAt;
}
