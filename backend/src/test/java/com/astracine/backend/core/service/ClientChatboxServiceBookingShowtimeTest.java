package com.astracine.backend.core.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Room;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.enums.MovieStatus;
import com.astracine.backend.core.enums.RoomStatus;
import com.astracine.backend.core.enums.ShowtimeStatus;
import com.astracine.backend.core.repository.ComboRepository;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.infrastructure.client.GeminiClient;
import com.astracine.backend.presentation.dto.chat.ChatMessageDTO;
import com.astracine.backend.presentation.dto.chat.ChatRequest;
import com.astracine.backend.presentation.dto.chat.ChatResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class ClientChatboxServiceBookingShowtimeTest {

    @Mock
    private MovieRepository movieRepository;

    @Mock
    private ShowtimeRepository showtimeRepository;

    @Mock
    private ComboRepository comboRepository;

    @Mock
    private SeatHoldService seatHoldService;

    @Mock
    private PayOSService payOSService;

    @Mock
    private InvoiceService invoiceService;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ClientChatboxService clientChatboxService;

    @Test
    void chat_shouldSuggestNearestShowtimeInsteadOfAutoSelectingWhenExactTimeDoesNotExist() {
        LocalDateTime tomorrow1602 = LocalDateTime.now().plusDays(1).withHour(16).withMinute(2).withSecond(0)
                .withNano(0);

        Movie avatar = buildMovie(1L, "Avatar 3");

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(movieRepository.findAll()).thenReturn(List.of(avatar));
        when(showtimeRepository.findAll()).thenReturn(List.of(
                buildShowtime(201L, avatar.getId(), "Room 1", tomorrow1602),
                buildShowtime(202L, avatar.getId(), "Room 1", tomorrow1602.plusMinutes(45))));
        when(comboRepository.findByStatus("ACTIVE")).thenReturn(List.of());

        ChatResponse response = clientChatboxService.chat(
                new ChatRequest(
                        "tôi muốn đặt vé phim avatar ngày mai suất 16h",
                        List.of(
                                new ChatMessageDTO("user", "phim avatar chiều mai có các suất chiếu nào"),
                                new ChatMessageDTO("model",
                                        "Chiều mai, phim Avatar 3 có các suất chiếu vào 16:02 và 16:47.")),
                        "my-test-session-001"),
                "guest-16h");

        assertEquals("booking-no-exact-showtime", response.getSource());
        assertEquals(1, response.getSuggestedMovies().size());
        assertEquals("Avatar 3", response.getSuggestedMovies().get(0).getTitle());
        assertEquals(1, response.getSuggestedShowtimes().size());
        assertEquals(tomorrow1602, response.getSuggestedShowtimes().get(0).getStartTime());
        assertTrue(response.getReply().contains("16:00"));
        assertTrue(response.getReply().contains("16:02"));
        verify(seatHoldService, never()).getSeatStates(201L);
        verify(seatHoldService, never()).getSeatStates(202L);
    }

    private Movie buildMovie(Long id, String title) {
        Movie movie = new Movie();
        movie.setId(id);
        movie.setTitle(title);
        movie.setDescription("Mo ta " + title);
        movie.setDurationMinutes(120);
        movie.setAgeRating("P");
        movie.setStatus(MovieStatus.NOW_SHOWING);
        movie.setGenres(Set.of());
        return movie;
    }

    private Showtime buildShowtime(Long id, Long movieId, String roomName, LocalDateTime startTime) {
        Room room = new Room();
        room.setId(id);
        room.setName(roomName);
        room.setTotalRows(10);
        room.setTotalColumns(10);
        room.setPriceMultiplier(BigDecimal.ONE);
        room.setStatus(RoomStatus.ACTIVE);

        Showtime showtime = new Showtime();
        showtime.setId(id);
        showtime.setMovieId(movieId);
        showtime.setRoom(room);
        showtime.setStartTime(startTime);
        showtime.setEndTime(startTime.plusHours(2));
        showtime.setStatus(ShowtimeStatus.OPEN);
        return showtime;
    }
}
