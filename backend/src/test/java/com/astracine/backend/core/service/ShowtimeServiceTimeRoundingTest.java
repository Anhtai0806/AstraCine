package com.astracine.backend.core.service;

import org.junit.jupiter.api.Test;

import com.astracine.backend.core.service.showtime.ShowtimeService;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ShowtimeServiceTimeRoundingTest {

    @Test
    void roundUpToFiveMinuteMark_shouldRoundForwardWhenMinuteIsNotDivisibleByFive() {
        LocalDateTime rounded = ShowtimeService.roundUpToFiveMinuteMark(
                LocalDateTime.of(2026, 4, 5, 15, 3));

        assertEquals(LocalDateTime.of(2026, 4, 5, 15, 5), rounded);
    }

    @Test
    void roundUpToFiveMinuteMark_shouldKeepExactFiveMinuteValues() {
        LocalDateTime rounded = ShowtimeService.roundUpToFiveMinuteMark(
                LocalDateTime.of(2026, 4, 5, 15, 5));

        assertEquals(LocalDateTime.of(2026, 4, 5, 15, 5), rounded);
    }

    @Test
    void roundUpToFiveMinuteMark_shouldStillRoundForwardWhenSecondsExist() {
        LocalDateTime rounded = ShowtimeService.roundUpToFiveMinuteMark(
                LocalDateTime.of(2026, 4, 5, 15, 0, 30));

        assertEquals(LocalDateTime.of(2026, 4, 5, 15, 5), rounded);
    }
}
