package com.astracine.backend.core.service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.astracine.backend.core.entity.Genre;
import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.enums.MovieStatus;
import com.astracine.backend.core.enums.ShowtimeStatus;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.infrastructure.client.GeminiClient;
import com.astracine.backend.infrastructure.client.GeminiClient.GeminiResult;
import com.astracine.backend.presentation.dto.chat.ChatMessageDTO;
import com.astracine.backend.presentation.dto.chat.ChatMovieSuggestionDTO;
import com.astracine.backend.presentation.dto.chat.ChatRequest;
import com.astracine.backend.presentation.dto.chat.ChatResponse;
import com.astracine.backend.presentation.dto.chat.ChatShowtimeSuggestionDTO;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ClientChatboxService {

    private static final DateTimeFormatter SHOWTIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX_MOVIE_CONTEXT = 8;
    private static final int MAX_SHOWTIME_CONTEXT = 12;

    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final GeminiClient geminiClient;

    public ChatResponse chat(ChatRequest request) {
        refreshMovieStatuses();

        List<Movie> movies = movieRepository.findAll();
        Map<Long, Movie> movieById = movies.stream()
                .collect(Collectors.toMap(Movie::getId, movie -> movie));

        LocalDateTime now = LocalDateTime.now();
        List<Showtime> upcomingShowtimes = showtimeRepository.findAll().stream()
                .filter(showtime -> showtime.getStatus() == ShowtimeStatus.OPEN)
                .filter(showtime -> showtime.getStartTime() != null && showtime.getStartTime().isAfter(now))
                .sorted(Comparator.comparing(Showtime::getStartTime))
                .collect(Collectors.toList());

        String mergedConversation = mergeConversation(request);
        Map<Long, Integer> movieScores = scoreMovies(mergedConversation, movies, upcomingShowtimes);

        List<Movie> rankedMovies = movies.stream()
                .sorted(Comparator
                        .comparingInt((Movie movie) -> movieScores.getOrDefault(movie.getId(), 0)).reversed()
                        .thenComparing((Movie movie) -> movie.getStatus() == MovieStatus.NOW_SHOWING ? 0 : 1)
                        .thenComparing(Movie::getTitle, String.CASE_INSENSITIVE_ORDER))
                .limit(MAX_MOVIE_CONTEXT)
                .collect(Collectors.toList());

        Set<Long> rankedMovieIds = rankedMovies.stream()
                .map(Movie::getId)
                .collect(Collectors.toCollection(HashSet::new));

        List<Showtime> rankedShowtimes = upcomingShowtimes.stream()
                .filter(showtime -> rankedMovieIds.contains(showtime.getMovieId()))
                .sorted(Comparator
                        .comparingInt((Showtime showtime) -> movieScores.getOrDefault(showtime.getMovieId(), 0))
                        .reversed()
                        .thenComparing(Showtime::getStartTime))
                .limit(MAX_SHOWTIME_CONTEXT)
                .collect(Collectors.toList());

        List<ChatMovieSuggestionDTO> suggestedMovies = rankedMovies.stream()
                .map(movie -> toMovieSuggestion(movie, movieScores.getOrDefault(movie.getId(), 0)))
                .collect(Collectors.toList());

        List<ChatShowtimeSuggestionDTO> suggestedShowtimes = rankedShowtimes.stream()
                .map(showtime -> toShowtimeSuggestion(showtime, movieById.get(showtime.getMovieId())))
                .collect(Collectors.toList());

        String systemInstruction = buildSystemInstruction();
        String dbContext = buildDatabaseContext(rankedMovies, rankedShowtimes, movieById, now);
        List<String> prompts = buildPrompts(request, dbContext);

        GeminiResult geminiResult = geminiClient.generateReply(systemInstruction, prompts);
        if (geminiResult.success()) {
            return new ChatResponse(
                    geminiResult.text(),
                    true,
                    "gemini",
                    suggestedMovies,
                    suggestedShowtimes);
        }

        return new ChatResponse(
                buildFallbackReply(request.getMessage(), suggestedMovies, suggestedShowtimes, geminiResult.errorMessage()),
                false,
                "local-fallback",
                suggestedMovies,
                suggestedShowtimes);
    }

    private void refreshMovieStatuses() {
        LocalDate today = LocalDate.now();
        movieRepository.markStoppedMovies(today);
        movieRepository.markComingSoonMovies(today);
        movieRepository.markNowShowingMovies(today);
    }

    private String mergeConversation(ChatRequest request) {
        List<String> parts = new ArrayList<>();
        if (request.getHistory() != null) {
            request.getHistory().stream()
                    .filter(message -> message.getContent() != null && !message.getContent().isBlank())
                    .forEach(message -> parts.add(message.getContent().trim()));
        }
        parts.add(request.getMessage().trim());
        return String.join(" ", parts);
    }

    private Map<Long, Integer> scoreMovies(String mergedConversation, List<Movie> movies, List<Showtime> upcomingShowtimes) {
        String normalizedConversation = normalize(mergedConversation);
        Set<Long> movieIdsWithUpcomingShowtimes = upcomingShowtimes.stream()
                .map(Showtime::getMovieId)
                .collect(Collectors.toSet());

        Map<Long, Integer> scores = new HashMap<>();
        boolean asksForNowShowing = containsAny(normalizedConversation,
                List.of("dang chieu", "hom nay", "xem ngay", "suat chieu", "lich chieu"));
        boolean asksForComingSoon = containsAny(normalizedConversation,
                List.of("sap chieu", "coming soon", "chuan bi chieu"));
        boolean asksForRecommendation = containsAny(normalizedConversation,
                List.of("goi y", "recommend", "nen xem", "de xuat", "tu van"));
        boolean asksForTime = containsAny(normalizedConversation,
                List.of("may gio", "toi nay", "chieu nay", "sang nay", "trua nay", "ngay mai"));

        for (Movie movie : movies) {
            int score = 0;
            String title = normalize(movie.getTitle());
            String description = normalize(movie.getDescription());
            String ageRating = normalize(movie.getAgeRating());
            Set<String> genres = movie.getGenres().stream()
                    .map(Genre::getName)
                    .map(this::normalize)
                    .collect(Collectors.toSet());

            if (!title.isBlank() && normalizedConversation.contains(title)) {
                score += 12;
            }

            for (String token : extractTokens(normalizedConversation)) {
                if (token.length() < 3) {
                    continue;
                }
                if (title.contains(token)) {
                    score += 3;
                }
                if (!description.isBlank() && description.contains(token)) {
                    score += 1;
                }
                if (!ageRating.isBlank() && ageRating.contains(token)) {
                    score += 1;
                }
                if (genres.stream().anyMatch(genre -> genre.contains(token) || token.contains(genre))) {
                    score += 4;
                }
            }

            if (movie.getStatus() == MovieStatus.NOW_SHOWING) {
                score += 2;
            }
            if (movieIdsWithUpcomingShowtimes.contains(movie.getId())) {
                score += 2;
            }
            if (asksForNowShowing && movie.getStatus() == MovieStatus.NOW_SHOWING) {
                score += 4;
            }
            if (asksForComingSoon && movie.getStatus() == MovieStatus.COMING_SOON) {
                score += 6;
            }
            if (asksForRecommendation && movie.getStatus() == MovieStatus.NOW_SHOWING) {
                score += 2;
            }
            if (asksForTime && movieIdsWithUpcomingShowtimes.contains(movie.getId())) {
                score += 4;
            }

            scores.put(movie.getId(), score);
        }
        return scores;
    }

    private String buildSystemInstruction() {
        return """
                Bạn là trợ lý chatbox của rạp phim AstraCine.
                Nhiệm vụ:
                - Chỉ được tư vấn dựa trên dữ liệu phim và suất chiếu mà backend cung cấp.
                - Có thể mô tả phim, gợi ý phim, gợi ý suất chiếu phù hợp với nhu cầu người dùng.
                - Nếu không có dữ liệu phù hợp, phải nói rõ là hiện tại rạp chưa có thông tin đó.
                - Khi gợi ý phim, nên nêu lý do ngắn gọn dựa trên thể loại, mô tả, độ tuổi, tình trạng đang chiếu.
                - Khi gợi ý suất chiếu, ưu tiên những suất sớm nhất và đúng trong context.
                - Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, thân thiện và dễ thao tác cho frontend.
                - Không được bịa ra tên phim, lịch chiếu, phòng chiếu, giá vé hoặc ưu đãi nếu không có trong context.
                """;
    }

    private String buildDatabaseContext(List<Movie> rankedMovies,
            List<Showtime> rankedShowtimes,
            Map<Long, Movie> movieById,
            LocalDateTime now) {
        StringBuilder context = new StringBuilder();
        context.append("Thời điểm hệ thống: ").append(now.format(SHOWTIME_FORMATTER)).append("\n");
        context.append("Danh sách phim liên quan:\n");

        for (Movie movie : rankedMovies) {
            context.append("- Phim #").append(movie.getId())
                    .append(": ").append(movie.getTitle())
                    .append(" | trạng thái=").append(movie.getStatus())
                    .append(" | thể loại=").append(joinGenres(movie.getGenres()))
                    .append(" | thời lượng=").append(movie.getDurationMinutes()).append(" phút")
                    .append(" | độ tuổi=").append(nullToUnknown(movie.getAgeRating()))
                    .append(" | khởi chiếu=").append(movie.getReleaseDate())
                    .append(" | kết thúc=").append(movie.getEndDate())
                    .append(" | mô tả=").append(safeText(movie.getDescription(), 220))
                    .append("\n");
        }

        context.append("Danh sách suất chiếu sắp tới:\n");
        if (rankedShowtimes.isEmpty()) {
            context.append("- Không có suất chiếu sắp tới phù hợp.\n");
        } else {
            for (Showtime showtime : rankedShowtimes) {
                Movie movie = movieById.get(showtime.getMovieId());
                context.append("- Suất #").append(showtime.getId())
                        .append(": phim=").append(movie == null ? "Không rõ" : movie.getTitle())
                        .append(" | bắt đầu=").append(showtime.getStartTime().format(SHOWTIME_FORMATTER))
                        .append(" | kết thúc=").append(showtime.getEndTime().format(SHOWTIME_FORMATTER))
                        .append(" | phòng=").append(showtime.getRoom().getName())
                        .append(" | trạng thái=").append(showtime.getStatus())
                        .append("\n");
            }
        }

        return context.toString();
    }

    private List<String> buildPrompts(ChatRequest request, String dbContext) {
        List<String> prompts = new ArrayList<>();
        prompts.add("Context dữ liệu rạp phim:\n" + dbContext);

        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            String history = request.getHistory().stream()
                    .filter(message -> message.getContent() != null && !message.getContent().isBlank())
                    .limit(8)
                    .map(this::formatHistoryMessage)
                    .collect(Collectors.joining("\n"));
            if (!history.isBlank()) {
                prompts.add("Hội thoại trước đó:\n" + history);
            }
        }

        prompts.add("Câu hỏi hiện tại của khách:\n" + request.getMessage().trim());
        return prompts;
    }

    private String formatHistoryMessage(ChatMessageDTO message) {
        String role = message.getRole() == null ? "user" : message.getRole().trim();
        return role + ": " + message.getContent().trim();
    }

    private ChatMovieSuggestionDTO toMovieSuggestion(Movie movie, Integer relevanceScore) {
        return new ChatMovieSuggestionDTO(
                movie.getId(),
                movie.getTitle(),
                movie.getDescription(),
                movie.getDurationMinutes(),
                movie.getAgeRating(),
                movie.getStatus() == null ? "UNKNOWN" : movie.getStatus().name(),
                movie.getReleaseDate(),
                movie.getEndDate(),
                movie.getGenres().stream().map(Genre::getName).sorted().collect(Collectors.toList()),
                movie.getPosterUrl(),
                relevanceScore);
    }

    private ChatShowtimeSuggestionDTO toShowtimeSuggestion(Showtime showtime, Movie movie) {
        return new ChatShowtimeSuggestionDTO(
                showtime.getId(),
                showtime.getMovieId(),
                movie == null ? "Phim không xác định" : movie.getTitle(),
                showtime.getRoom().getId(),
                showtime.getRoom().getName(),
                showtime.getStartTime(),
                showtime.getEndTime(),
                showtime.getStatus() == null ? "UNKNOWN" : showtime.getStatus().name());
    }

    private String buildFallbackReply(String userMessage,
            List<ChatMovieSuggestionDTO> suggestedMovies,
            List<ChatShowtimeSuggestionDTO> suggestedShowtimes,
            String aiErrorMessage) {
        StringBuilder reply = new StringBuilder();
        reply.append("Mình đã kiểm tra dữ liệu phim và suất chiếu hiện có của rạp");
        if (aiErrorMessage != null && !aiErrorMessage.isBlank()) {
            reply.append(", nhưng hiện chưa gọi được Gemini");
        }
        reply.append(". ");

        if (!suggestedMovies.isEmpty()) {
            reply.append("Bạn có thể tham khảo ");
            reply.append(suggestedMovies.stream()
                    .limit(3)
                    .map(ChatMovieSuggestionDTO::getTitle)
                    .collect(Collectors.joining(", ")));
            reply.append(". ");
        } else {
            reply.append("Hiện mình chưa tìm thấy phim phù hợp trực tiếp với yêu cầu \"")
                    .append(userMessage.trim())
                    .append("\". ");
        }

        if (!suggestedShowtimes.isEmpty()) {
            reply.append("Một vài suất chiếu gần nhất là ");
            reply.append(suggestedShowtimes.stream()
                    .limit(3)
                    .map(showtime -> showtime.getMovieTitle() + " lúc "
                            + showtime.getStartTime().format(SHOWTIME_FORMATTER)
                            + " tại " + showtime.getRoomName())
                    .collect(Collectors.joining("; ")));
            reply.append(". ");
        } else {
            reply.append("Hiện chưa có suất chiếu sắp tới phù hợp trong dữ liệu. ");
        }

        reply.append("Frontend vẫn có thể dùng danh sách gợi ý đi kèm để hiển thị phim và lịch chiếu.");
        return reply.toString();
    }

    private String safeText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "Không có mô tả";
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.length() <= maxLength) {
            return normalized;
        }
        return normalized.substring(0, maxLength - 3) + "...";
    }

    private String joinGenres(Collection<Genre> genres) {
        if (genres == null || genres.isEmpty()) {
            return "Không rõ";
        }
        return genres.stream()
                .map(Genre::getName)
                .sorted()
                .collect(Collectors.joining(", "));
    }

    private String nullToUnknown(Object value) {
        return value == null ? "Không rõ" : String.valueOf(value);
    }

    private boolean containsAny(String text, List<String> keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) {
                return true;
            }
        }
        return false;
    }

    private Set<String> extractTokens(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }

        String cleaned = text.replaceAll("[^\\p{L}\\p{Nd}\\s]", " ");
        return List.of(cleaned.split("\\s+")).stream()
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .collect(Collectors.toCollection(HashSet::new));
    }

    private String normalize(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);

        Map<String, String> replacements = new LinkedHashMap<>();
        replacements.put("\u0111", "d");
        replacements.put("\u0110", "d");

        for (Map.Entry<String, String> entry : replacements.entrySet()) {
            normalized = normalized.replace(entry.getKey(), entry.getValue());
        }

        return normalized.replaceAll("\\s+", " ").trim();
    }
}
