package com.astracine.backend.presentation.dto.seat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

import com.astracine.backend.core.enums.SeatBookingStatus;
import com.astracine.backend.core.enums.SeatType;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatStateDto {
    private Long seatId;
    private String rowLabel;
    private Integer columnNumber;
    private SeatType seatType;

    private BigDecimal finalPrice;

    private SeatBookingStatus status;

    /** epoch millis - chỉ có khi status=HELD */
    private Long heldExpiresAt;

    /** true nếu ghế đang HELD bởi chính current user */
    @Builder.Default
    private Boolean heldByCurrentUser = false;

    /** hold id hiện tại của ghế, chỉ có khi status=HELD */
    private String holdId;
}