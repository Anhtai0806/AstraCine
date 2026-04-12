package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.service.showtime.ShowtimeSchedulingScoreService;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShowtimeSchedulingScoreServiceTest {

        private final ShowtimeSchedulingScoreService scoringService = new ShowtimeSchedulingScoreService();

        @Test
        void pickBestMovie_shouldPreferHotMovieWhenCountsAreEqual() {
                Movie hotMovie = movie(1L, "Hot Movie", 5, 120);
                Movie weakMovie = movie(2L, "Weak Movie", 1, 120);

                Movie selected = scoringService.pickBestMovie(
                                List.of(hotMovie, weakMovie),
                                new HashMap<>(Map.of(
                                                hotMovie.getId(), 0,
                                                weakMovie.getId(), 0)),
                                new HashMap<>(),
                                LocalDateTime.of(2026, 4, 3, 14, 0),
                                null,
                                1L);

                assertNotNull(selected);
                assertEquals(hotMovie.getId(), selected.getId());
        }

        @Test
        void pickBestMovie_shouldEventuallyCompensateWhenHotMovieIsAlreadyOverscheduled() {
                Movie hotMovie = movie(1L, "Hot Movie", 5, 120);
                Movie weakMovie = movie(2L, "Weak Movie", 1, 120);

                Movie selected = scoringService.pickBestMovie(
                                List.of(hotMovie, weakMovie),
                                new HashMap<>(Map.of(
                                                hotMovie.getId(), 12,
                                                weakMovie.getId(), 0)),
                                new HashMap<>(),
                                LocalDateTime.of(2026, 4, 3, 14, 0),
                                null,
                                1L);

                assertNotNull(selected);
                assertEquals(weakMovie.getId(), selected.getId());
        }

        @Test
        void prioritizeMoviesForPrimeTime_shouldKeepOnlyHotMoviesWhenAvailable() {
                Movie hotMovie = movie(1L, "Hot Movie", 4, 120);
                Movie normalMovie = movie(2L, "Normal Movie", 3, 120);

                List<Movie> prioritized = scoringService.prioritizeMoviesForPrimeTime(
                                List.of(hotMovie, normalMovie),
                                LocalDateTime.of(2026, 4, 3, 19, 30));

                assertEquals(1, prioritized.size());
                assertEquals(hotMovie.getId(), prioritized.get(0).getId());
        }

        @Test
        void prioritizeMoviesForPrimeTime_shouldNotFilterOutsidePrimeTime() {
                Movie hotMovie = movie(1L, "Hot Movie", 4, 120);
                Movie normalMovie = movie(2L, "Normal Movie", 3, 120);

                List<Movie> prioritized = scoringService.prioritizeMoviesForPrimeTime(
                                List.of(hotMovie, normalMovie),
                                LocalDateTime.of(2026, 4, 3, 15, 30));

                assertEquals(2, prioritized.size());
        }

        @Test
        void pickBestMovie_shouldGiveLowPriorityMovieASlotInLowDemandWindow() {
                Movie hotMovie = movie(1L, "Hot Movie", 5, 120);
                Movie lowMovie = movie(2L, "Low Priority Movie", 1, 120);

                Movie selected = scoringService.pickBestMovie(
                                List.of(hotMovie, lowMovie),
                                new HashMap<>(Map.of(
                                                hotMovie.getId(), 4,
                                                lowMovie.getId(), 0)),
                                new HashMap<>(),
                                LocalDateTime.of(2026, 4, 3, 12, 0),
                                null,
                                1L);

                assertNotNull(selected);
                assertEquals(lowMovie.getId(), selected.getId());
        }

        @Test
        void pickBestMovie_shouldVarySelectionsAcrossDifferentDaysWhenConditionsAreSimilar() {
                Movie movieA = movie(1L, "Movie A", 3, 120);
                Movie movieB = movie(2L, "Movie B", 3, 120);
                Movie movieC = movie(3L, "Movie C", 3, 120);
                List<Movie> candidates = List.of(movieA, movieB, movieC);
                List<Long> selectedMovieIds = new ArrayList<>();

                for (int day = 3; day <= 6; day++) {
                        Movie selected = scoringService.pickBestMovie(
                                        candidates,
                                        new HashMap<>(Map.of(
                                                        movieA.getId(), 0,
                                                        movieB.getId(), 0,
                                                        movieC.getId(), 0)),
                                        new HashMap<>(),
                                        LocalDateTime.of(2026, 4, day, 15, 0),
                                        null,
                                        1L);
                        selectedMovieIds.add(selected.getId());
                }

                long distinctSelections = selectedMovieIds.stream().distinct().count();
                assertTrue(distinctSelections >= 2);
        }

        private Movie movie(Long id, String title, int priority, int durationMinutes) {
                Movie movie = new Movie();
                movie.setId(id);
                movie.setTitle(title);
                movie.setPriority(priority);
                movie.setDurationMinutes(durationMinutes);
                return movie;
        }
}
