package com.astracine.backend.core.service.showtime;

import com.astracine.backend.core.entity.Movie;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ShowtimeSchedulingScoreService {

    private static final int DEFAULT_PRIORITY = 3;
    private static final int HOT_MOVIE_PRIORITY = 4;
    private static final LocalTime EARLY_MORNING_END = LocalTime.of(9, 0);
    private static final LocalTime MIDDAY_START = LocalTime.of(11, 0);
    private static final LocalTime MIDDAY_END = LocalTime.of(14, 0);
    private static final LocalTime PRIME_TIME_START = LocalTime.of(18, 0);
    private static final LocalTime PRIME_TIME_END = LocalTime.of(22, 0);
    private static final LocalTime LATE_NIGHT_START = LocalTime.of(22, 0);

    public Movie pickBestMovie(List<Movie> candidates,
            Map<Long, Integer> movieCounts,
            Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage,
            LocalDateTime slotStart,
            Long previousMovieId,
            Long roomId) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        List<Movie> prioritizedCandidates = prioritizeMoviesForPrimeTime(candidates, slotStart);

        return prioritizedCandidates.stream()
                .max(Comparator
                        .comparingDouble((Movie movie) -> calculateSchedulingScore(
                                movie,
                                prioritizedCandidates,
                                movieCounts,
                                slotMovieUsage,
                                slotStart,
                                previousMovieId,
                                roomId))
                        .thenComparingInt(this::normalizePriority)
                        .thenComparing(Movie::getDurationMinutes, Comparator.reverseOrder())
                        .thenComparing(Movie::getTitle, String.CASE_INSENSITIVE_ORDER))
                .orElse(null);
    }

    public double calculateSchedulingScore(Movie movie,
            List<Movie> candidatePool,
            Map<Long, Integer> movieCounts,
            Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage,
            LocalDateTime slotStart,
            Long previousMovieId,
            Long roomId) {
        double weightedDemandGap = calculateWeightedDemandGap(movie, candidatePool, movieCounts);
        double primeTimeBoost = calculatePrimeTimeBoost(movie, slotStart);
        double offPeakBoost = calculateOffPeakBoost(movie, movieCounts, slotStart);
        double dayVarietyBoost = calculateDayVarietyBoost(movie, slotStart, roomId);
        double consecutivePenalty = getConsecutivePenalty(movie, previousMovieId) * 4.0;
        double duplicatePenalty = getSameMovieAtSameTimePenalty(slotMovieUsage, slotStart, movie.getId()) * 12.0;
        double slotLoadPenalty = getSlotLoadPenalty(slotMovieUsage, slotStart) * 1.5;

        return weightedDemandGap + primeTimeBoost + offPeakBoost + dayVarietyBoost
                - consecutivePenalty - duplicatePenalty - slotLoadPenalty;
    }

    public List<Movie> prioritizeMoviesForPrimeTime(List<Movie> candidates, LocalDateTime slotStart) {
        if (candidates == null || candidates.isEmpty() || !isPrimeTime(slotStart)) {
            return candidates;
        }

        List<Movie> hotMovies = candidates.stream()
                .filter(this::isHotMovie)
                .toList();

        return hotMovies.isEmpty() ? candidates : hotMovies;
    }

    public boolean isPrimeTime(LocalDateTime slotStart) {
        LocalTime startTime = slotStart.toLocalTime();
        return !startTime.isBefore(PRIME_TIME_START) && !startTime.isAfter(PRIME_TIME_END);
    }

    public boolean isHotMovie(Movie movie) {
        return normalizePriority(movie) >= HOT_MOVIE_PRIORITY;
    }

    private double calculateWeightedDemandGap(Movie movie,
            List<Movie> candidatePool,
            Map<Long, Integer> movieCounts) {
        double totalWeight = candidatePool.stream()
                .mapToDouble(this::priorityWeight)
                .sum();
        if (totalWeight <= 0) {
            return 0;
        }

        int totalScheduledShows = movieCounts.values().stream()
                .mapToInt(Integer::intValue)
                .sum();
        int currentMovieCount = movieCounts.getOrDefault(movie.getId(), 0);

        double targetShowCountAfterThisSlot = (totalScheduledShows + 1.0) * priorityWeight(movie) / totalWeight;
        return (targetShowCountAfterThisSlot - currentMovieCount) * 100.0;
    }

    private double calculatePrimeTimeBoost(Movie movie, LocalDateTime slotStart) {
        if (!isPrimeTime(slotStart)) {
            return 0;
        }

        return switch (normalizePriority(movie)) {
            case 5 -> 30;
            case 4 -> 18;
            case 3 -> 4;
            case 2 -> -6;
            default -> -12;
        };
    }

    private double calculateOffPeakBoost(Movie movie,
            Map<Long, Integer> movieCounts,
            LocalDateTime slotStart) {
        if (!isLowDemandWindow(slotStart)) {
            return 0;
        }

        int priority = normalizePriority(movie);
        int currentCount = movieCounts.getOrDefault(movie.getId(), 0);
        boolean hasNoShowYet = currentCount == 0;

        return switch (priority) {
            case 1 -> hasNoShowYet ? 42 : 24;
            case 2 -> hasNoShowYet ? 28 : 16;
            case 3 -> 6;
            case 4 -> -4;
            default -> -8;
        };
    }

    private double calculateDayVarietyBoost(Movie movie, LocalDateTime slotStart, Long roomId) {
        long seed = slotStart.toLocalDate().toEpochDay() * 37
                + slotStart.getHour() * 11L
                + slotStart.getMinute() * 3L
                + (roomId == null ? 0 : roomId * 17L)
                + movie.getId() * 13L;

        int bucket = Math.floorMod(seed, 17);
        double centeredBias = bucket - 8;
        double priorityTuning = normalizePriority(movie) >= HOT_MOVIE_PRIORITY ? 1.8 : 2.4;
        return centeredBias * priorityTuning;
    }

    private double priorityWeight(Movie movie) {
        return switch (normalizePriority(movie)) {
            case 5 -> 8.0;
            case 4 -> 5.5;
            case 3 -> 3.5;
            case 2 -> 2.3;
            default -> 1.6;
        };
    }

    private boolean isLowDemandWindow(LocalDateTime slotStart) {
        LocalTime time = slotStart.toLocalTime();
        return time.isBefore(EARLY_MORNING_END)
                || (!time.isBefore(MIDDAY_START) && !time.isAfter(MIDDAY_END))
                || !time.isBefore(LATE_NIGHT_START);
    }

    private int getConsecutivePenalty(Movie movie, Long previousMovieId) {
        if (!Objects.equals(movie.getId(), previousMovieId)) {
            return 0;
        }

        int priority = normalizePriority(movie);
        return priority == 5 ? 0 : (6 - priority) * 2;
    }

    private int getSameMovieAtSameTimePenalty(Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage,
            LocalDateTime startTime,
            Long movieId) {
        return slotMovieUsage.getOrDefault(startTime, Map.of()).getOrDefault(movieId, 0);
    }

    private int getSlotLoadPenalty(Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage, LocalDateTime startTime) {
        return slotMovieUsage.getOrDefault(startTime, Map.of()).values().stream()
                .mapToInt(Integer::intValue)
                .sum();
    }

    private int normalizePriority(Movie movie) {
        Integer priority = movie.getPriority();
        if (priority == null) {
            return DEFAULT_PRIORITY;
        }
        return Math.max(1, Math.min(5, priority));
    }
}
