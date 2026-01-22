package com.astracine.backend.exception;

import lombok.Getter;

import java.util.List;

@Getter
public class HoldConflictException extends RuntimeException {
    private final Long showtimeId;
    private final List<Long> conflictSeatIds;

    public HoldConflictException(Long showtimeId, List<Long> conflictSeatIds) {
        super("One or more seats are already held");
        this.showtimeId = showtimeId;
        this.conflictSeatIds = conflictSeatIds;
    }
}
