package com.astracine.backend.presentation.exception;

import lombok.Getter;

import java.util.List;

@Getter
public class SeatAlreadySoldException extends RuntimeException {
    private final Long showtimeId;
    private final List<Long> soldSeatIds;

    public SeatAlreadySoldException(Long showtimeId, List<Long> soldSeatIds) {
        super("One or more seats are already sold");
        this.showtimeId = showtimeId;
        this.soldSeatIds = soldSeatIds;
    }
}
