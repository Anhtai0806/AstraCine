package com.astracine.backend.core.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.astracine.backend.core.entity.Combo;
import com.astracine.backend.core.entity.Genre;
import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.enums.MovieStatus;
import com.astracine.backend.core.enums.SeatBookingStatus;
import com.astracine.backend.core.enums.ShowtimeStatus;
import com.astracine.backend.core.repository.ComboRepository;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.core.service.payment.InvoiceService;
import com.astracine.backend.core.service.payment.PayOSService;
import com.astracine.backend.infrastructure.client.GeminiClient;
import com.astracine.backend.infrastructure.client.GeminiClient.GeminiResult;
import com.astracine.backend.presentation.dto.chat.ChatBookingStateDTO;
import com.astracine.backend.presentation.dto.chat.ChatMessageDTO;
import com.astracine.backend.presentation.dto.chat.ChatMovieSuggestionDTO;
import com.astracine.backend.presentation.dto.chat.ChatRequest;
import com.astracine.backend.presentation.dto.chat.ChatResponse;
import com.astracine.backend.presentation.dto.chat.ChatShowtimeSuggestionDTO;
import com.astracine.backend.presentation.dto.hold.HoldResponse;
import com.astracine.backend.presentation.dto.invoice.ETicketDTO;
import com.astracine.backend.presentation.dto.payment.ComboCartItemDTO;
import com.astracine.backend.presentation.dto.payment.PayOSCreateResponse;
import com.astracine.backend.presentation.dto.seat.SeatStateDto;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ClientChatboxService {

    private static final DateTimeFormatter SHOWTIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX_MOVIE_CONTEXT = 8;
    private static final int MAX_SHOWTIME_CONTEXT = 12;
    private static final int MAX_FINAL_SUGGESTIONS = 3;
    private static final int BOOKING_SESSION_TTL_MINUTES = 30;
    private static final String BOOKING_CONTINUE_PROMPT = "Bạn có muốn tiếp tục đặt vé không, nếu có thì nhắn 'tiếp tục', nếu không thì nhắn 'huỷ'";
    private static final Set<String> GENERIC_MOVIE_TOKENS = Set.of(
            "phim", "movie", "rap", "ve", "suat", "chieu", "ngay", "mai", "hom", "nay",
            "nao", "nhung", "co", "toi", "muon", "biet", "xem");
    private static final Pattern EXPLICIT_TIME_PATTERN = Pattern
            .compile("\\b([01]?\\d|2[0-3])\\s*[:hHgG]\\s*(\\d{1,2})\\b");
    private static final Pattern HOUR_ONLY_PATTERN = Pattern.compile("\\b([01]?\\d|2[0-3])\\s*(?:h|gio)\\b");
    private static final Pattern SEAT_CODE_PATTERN = Pattern.compile("\\b([A-Za-z])\\s*(\\d{1,2})\\b");
    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\b(\\d{1,2})\\b");
    private static final Pattern COMBO_INDEX_SELECTION_PATTERN = Pattern
            .compile("\\b(?:(\\d+)\\s*(?:x\\s*)?)?combo\\s*(\\d{1,2})\\b");
    private static final Map<String, List<String>> INTENT_KEYWORDS = Map.ofEntries(
            Map.entry("BOOKING",
                    List.of("dat ve", "mua ve", "book ve", "giu ghe", "chon ghe", "dat cho", "thanh toan", "qr",
                            "payos", "dat lich", "dat lich phim", "book lich")),
            Map.entry("CANCEL", List.of("huy", "thoi khong dat", "bo qua", "cancel")),
            Map.entry("CONFIRM", List.of("xac nhan", "dong y", "oke", "ok", "chot don")),
            Map.entry("PAID", List.of("da thanh toan", "da chuyen khoan", "xong", "thanh toan xong")),
            Map.entry("SKIP_COMBO",
                    List.of("khong", "ko", "khong combo", "khong can combo", "khong lay combo", "khong bap nuoc",
                            "khong can bap nuoc", "khong mua", "khong can", "thoi khong")),
            Map.entry("SHOWTIME_SELECTION", List.of("suat", "gio", "hom nay", "ngay mai", "thu")),
            Map.entry("NOW_SHOWING", List.of("dang chieu", "hom nay", "xem ngay", "suat chieu", "lich chieu")),
            Map.entry("COMING_SOON", List.of("sap chieu", "coming soon", "chuan bi chieu")),
            Map.entry("RECOMMENDATION", List.of("goi y", "recommend", "nen xem", "de xuat", "tu van")),
            Map.entry("TIME_QUERY", List.of("may gio", "toi nay", "chieu nay", "sang nay", "trua nay", "ngay mai")),
            Map.entry("TODAY", List.of("hom nay", "toi nay")),
            Map.entry("TOMORROW", List.of("ngay mai", "toi mai", "sang mai", "trua mai", "chieu mai")),
            Map.entry("TIME_SLOT_MORNING", List.of("buoi sang", "vao sang", "suat sang", "sang mai", "sang nay")),
            Map.entry("TIME_SLOT_NOON", List.of("buoi trua", "vao trua", "suat trua", "trua mai", "trua nay")),
            Map.entry("TIME_SLOT_AFTERNOON",
                    List.of("buoi chieu", "vao chieu", "suat buoi chieu", "chieu mai", "chieu nay")),
            Map.entry("TIME_SLOT_EVENING", List.of("buoi toi", "vao toi", "suat toi", "toi mai", "toi nay")));
    private static final Map<String, List<String>> GENRE_KEYWORDS = Map.ofEntries(
            Map.entry("horror", List.of("kinh di", "horror")),
            Map.entry("action", List.of("hanh dong", "action")),
            Map.entry("romantic", List.of("tinh cam", "lang man", "romance")),
            Map.entry("comedy", List.of("hai", "comedy")));

    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ComboRepository comboRepository;
    private final SeatHoldService seatHoldService;
    private final PayOSService payOSService;
    private final InvoiceService invoiceService;
    private final StringRedisTemplate redisTemplate;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public ChatResponse chat(ChatRequest request, String userId) {
        refreshMovieStatuses();

        String sessionId = resolveSessionId(request);
        BookingSession bookingSession = loadBookingSession(userId, sessionId);
        String normalizedMessage = normalize(request.getMessage());

        if (bookingSession != null && shouldExitBookingFlow(bookingSession, normalizedMessage)) {
            rollbackBookingSession(userId, bookingSession);
            bookingSession = null;
        }

        if (bookingSession != null || isBookingIntent(normalizedMessage)) {
            return handleBookingConversation(request, userId, sessionId, bookingSession);
        }

        return handleAssistantConversation(request, sessionId);
    }

    private ChatResponse handleBookingConversation(ChatRequest request, String userId, String sessionId,
            BookingSession existingSession) {
        BookingSession session = existingSession != null ? existingSession : new BookingSession();
        session.setActive(true);
        session.setSessionId(sessionId);

        List<Movie> movies = getActiveMovies();
        Map<Long, Movie> movieById = movies.stream().collect(Collectors.toMap(Movie::getId, movie -> movie));
        LocalDateTime now = LocalDateTime.now();
        String normalizedMessage = normalize(request.getMessage());
        String mergedConversation = mergeConversation(request);
        String mergedUserConversation = mergeUserConversation(request);

        if (containsCancelIntent(normalizedMessage)) {
            rollbackBookingSession(userId, session);
            return fallbackResponse(
                    "Mình đã hủy toàn bộ phiên đặt vé hiện tại. Khi cần, bạn chỉ cần nhắn lại phim hoặc suất chiếu muốn đặt.",
                    sessionId);
        }

        if (session.isAwaitingPayment() && session.getOrderCode() != null) {
            return handlePendingPayment(request, userId, session, movieById);
        }

        if (existingSession != null && isOffTopicDuringBooking(request.getMessage(), normalizedMessage, movies)) {
            saveBookingSession(userId, session);
            return bookingResponse(
                    BOOKING_CONTINUE_PROMPT,
                    false,
                    "booking-off-topic",
                    movieSuggestionFromSession(session, movieById),
                    showtimeSuggestionFromSession(session, movieById),
                    sessionId,
                    toBookingState(session, movieById),
                    List.of(),
                    null,
                    null);
        }

        Long detectedMovieId = extractSpecificMovieId(normalizedMessage, movies);
        if (detectedMovieId != null && !Objects.equals(detectedMovieId, session.getMovieId())) {
            releaseCurrentHoldQuietly(session, userId);
            session.setMovieId(detectedMovieId);
            clearShowtimeSelection(session);
        }

        if (session.getMovieId() == null) {
            List<ChatMovieSuggestionDTO> candidates = suggestMoviesForBooking(mergedConversation, movies);
            saveBookingSession(userId, session);
            return bookingResponse(
                    buildMovieQuestion(candidates),
                    false,
                    "booking-collect-movie",
                    candidates,
                    List.of(),
                    sessionId,
                    toBookingState(session, movieById),
                    activeComboSuggestions(),
                    null,
                    null);
        }

        Movie selectedMovie = movieById.get(session.getMovieId());
        if (selectedMovie == null) {
            rollbackBookingSession(userId, session);
            return fallbackResponse(
                    "Mình không còn tìm thấy phim bạn đang chọn trong dữ liệu hiện tại, nên đã reset phiên đặt vé. Bạn giúp mình chọn lại phim nhé.",
                    sessionId);
        }

        UserPreference preference = extractUserPreference(mergedUserConversation, now, movies);
        List<Showtime> movieShowtimes = getUpcomingShowtimes(now, movieById, preference, session.getMovieId());
        List<Showtime> prioritizedShowtimes = prioritizeBookingShowtimes(movieShowtimes, preference);
        boolean exactShowtimeMatch = hasExactShowtimeMatch(movieShowtimes, preference.targetTime());
        List<ChatShowtimeSuggestionDTO> showtimeSuggestions = prioritizedShowtimes.stream()
                .limit(MAX_FINAL_SUGGESTIONS)
                .map(showtime -> toShowtimeSuggestion(showtime, selectedMovie))
                .collect(Collectors.toList());

        Long detectedShowtimeId = detectShowtimeSelection(session, prioritizedShowtimes, preference, normalizedMessage);
        if (detectedShowtimeId != null && !Objects.equals(detectedShowtimeId, session.getShowtimeId())) {
            releaseCurrentHoldQuietly(session, userId);
            clearShowtimeSelection(session);
            session.setShowtimeId(detectedShowtimeId);
        }

        if (session.getShowtimeId() == null) {
            saveBookingSession(userId, session);
            return bookingResponse(
                    showtimeSuggestions.isEmpty()
                            ? "Hiện mình chưa thấy suất chiếu phù hợp cho phim " + selectedMovie.getTitle()
                                    + ". Bạn có thể đổi ngày/giờ khác hoặc chọn phim khác."
                            : buildShowtimePrompt(selectedMovie, showtimeSuggestions, preference, exactShowtimeMatch),
                    false,
                    showtimeSuggestions.isEmpty()
                            ? "booking-no-showtime"
                            : (preference.targetTime() != null && !exactShowtimeMatch
                                    ? "booking-no-exact-showtime"
                                    : "booking-collect-showtime"),
                    List.of(toMovieSuggestion(selectedMovie, 100)),
                    showtimeSuggestions,
                    sessionId,
                    toBookingState(session, movieById),
                    activeComboSuggestions(),
                    null,
                    null);
        }

        Showtime selectedShowtime = prioritizedShowtimes.stream()
                .filter(showtime -> Objects.equals(showtime.getId(), session.getShowtimeId()))
                .findFirst()
                .orElseGet(() -> showtimeRepository.findById(session.getShowtimeId()).orElse(null));
        if (selectedShowtime == null) {
            releaseCurrentHoldQuietly(session, userId);
            clearShowtimeSelection(session);
            saveBookingSession(userId, session);
            return bookingResponse(
                    "Suất chiếu bạn chọn không còn hợp lệ nữa. Mình đã reset phần suất chiếu, bạn chọn lại giúp mình nhé.",
                    false,
                    "booking-reset-showtime",
                    List.of(toMovieSuggestion(selectedMovie, 100)),
                    showtimeSuggestions,
                    sessionId,
                    toBookingState(session, movieById),
                    activeComboSuggestions(),
                    null,
                    null);
        }

        List<SeatStateDto> seatStates = seatHoldService.getSeatStates(selectedShowtime.getId(), userId);
        Map<String, SeatStateDto> seatStateByCode = seatStates.stream()
                .collect(Collectors.toMap(this::seatCode, seat -> seat, (left, right) -> left, LinkedHashMap::new));
        Map<String, SeatStateDto> selectableSeatMap = seatStates.stream()
                .filter(seat -> seat.getStatus() == SeatBookingStatus.AVAILABLE
                        || (seat.getStatus() == SeatBookingStatus.HELD
                                && Boolean.TRUE.equals(seat.getHeldByCurrentUser())))
                .collect(Collectors.toMap(this::seatCode, seat -> seat, (left, right) -> left, LinkedHashMap::new));
        Map<String, SeatStateDto> availableSeatMap = seatStates.stream()
                .filter(seat -> seat.getStatus() == SeatBookingStatus.AVAILABLE)
                .collect(Collectors.toMap(this::seatCode, seat -> seat, (left, right) -> left, LinkedHashMap::new));

        List<String> parsedSeatCodes = parseSeatCodesFromMessage(request.getMessage());
        List<Long> previousSeatIds = session.getSeatIds() == null
                ? List.of()
                : new ArrayList<>(session.getSeatIds());
        List<String> soldSeatCodes = new ArrayList<>();
        List<String> heldSeatCodes = new ArrayList<>();
        List<String> unknownSeatCodes = new ArrayList<>();
        for (String seatCode : parsedSeatCodes) {
            SeatStateDto seat = seatStateByCode.get(seatCode);
            if (seat == null) {
                unknownSeatCodes.add(seatCode);
                continue;
            }
            if (seat.getStatus() == SeatBookingStatus.SOLD) {
                soldSeatCodes.add(seatCode);
            } else if (seat.getStatus() == SeatBookingStatus.HELD
                    && !Boolean.TRUE.equals(seat.getHeldByCurrentUser())) {
                heldSeatCodes.add(seatCode);
            }
        }

        if (mentionsSeatChange(normalizedMessage)) {
            releaseCurrentHoldQuietly(session, userId);
            session.setSeatIds(new ArrayList<>());
            clearPendingPaymentState(session);
            session.setAwaitingConfirmation(false);
            saveBookingSession(userId, session);
            return bookingResponse(
                    "Mình đã chuyển lại bước chọn ghế để bạn chọn lại. "
                            + buildSeatQuestion(selectedMovie, selectedShowtime, availableSeatMap),
                    false,
                    "booking-reset-seats",
                    List.of(),
                    List.of(),
                    sessionId,
                    toBookingState(session, movieById),
                    List.of(),
                    null,
                    null);
        }

        List<Long> parsedSeatIds = parseSeatIdsFromMessage(request.getMessage(), selectableSeatMap, true);
        List<Long> parsedSeatIdsForRemoval = parseSeatIdsFromMessage(request.getMessage(), seatStateByCode, false);
        if (mentionsSeatRemoval(normalizedMessage)) {
            session.setSeatIds(removeSeatIds(session.getSeatIds(), parsedSeatIdsForRemoval));
            clearPendingPaymentState(session);
            session.setAwaitingConfirmation(false);
        } else if (!parsedSeatIds.isEmpty()) {
            session.setSeatIds(shouldAppendSeats(normalizedMessage)
                    ? mergeSeatIds(session.getSeatIds(), parsedSeatIds)
                    : parsedSeatIds);
            clearPendingPaymentState(session);
            session.setAwaitingConfirmation(false);
        }

        if (!sameSeatSelection(previousSeatIds, session.getSeatIds())) {
            if (session.getSeatIds() == null || session.getSeatIds().isEmpty()) {
                releaseCurrentHoldQuietly(session, userId);
            } else {
                try {
                    replaceSeatHold(selectedShowtime.getId(), session, userId);
                } catch (Exception ex) {
                    log.warn("Chat booking seat hold sync failed", ex);
                    session.setSeatIds(new ArrayList<>());
                    clearPendingPaymentState(session);
                    session.setAwaitingConfirmation(false);
                    saveBookingSession(userId, session);
                    return bookingResponse(
                            "Ghế bạn vừa chọn không còn khả dụng nên mình đã reset lại bước chọn ghế. Bạn chọn lại giúp mình nhé.",
                            false,
                            "booking-seat-hold-failed",
                            List.of(),
                            List.of(),
                            sessionId,
                            toBookingState(session, movieById),
                            List.of(),
                            null,
                            null);
                }
            }
        }

        if (session.getSeatIds() == null || session.getSeatIds().isEmpty()) {
            saveBookingSession(userId, session);
            String seatQuestion = buildSeatQuestion(selectedMovie, selectedShowtime, availableSeatMap);
            String seatWarning = buildSeatValidationWarning(parsedSeatCodes, soldSeatCodes, heldSeatCodes,
                    unknownSeatCodes);
            String reply = seatWarning == null ? seatQuestion : seatWarning + " " + seatQuestion;
            return bookingResponse(
                    reply,
                    false,
                    "booking-collect-seats",
                    List.of(),
                    List.of(),
                    sessionId,
                    toBookingState(session, movieById),
                    List.of(),
                    null,
                    null);
        }

        List<ComboCartItemDTO> comboSuggestions = activeComboSuggestions();
        if (mentionsComboChange(normalizedMessage)) {
            session.setComboItems(new ArrayList<>());
            session.setComboResolved(false);
            session.setAwaitingConfirmation(false);
            saveBookingSession(userId, session);
            return bookingResponse(
                    buildComboQuestion(comboSuggestions),
                    false,
                    "booking-reset-combos",
                    List.of(),
                    List.of(),
                    sessionId,
                    toBookingState(session, movieById),
                    comboSuggestions,
                    null,
                    null);
        }

        List<ComboCartItemDTO> parsedCombos = parseCombosFromMessage(request.getMessage(), comboSuggestions);
        if (!session.isComboResolved() || !parsedCombos.isEmpty() || mentionsComboSkip(normalizedMessage)
                || mentionsComboRemoval(normalizedMessage)) {
            if (containsComboSkipIntent(normalizedMessage)) {
                session.setComboItems(new ArrayList<>());
                session.setComboResolved(true);
                session.setAwaitingConfirmation(false);
            } else if (mentionsComboRemoval(normalizedMessage)) {
                if (parsedCombos.isEmpty()) {
                    session.setComboItems(new ArrayList<>());
                } else {
                    session.setComboItems(removeComboItems(session.getComboItems(), parsedCombos, normalizedMessage));
                }
                session.setComboResolved(true);
                session.setAwaitingConfirmation(false);
            } else {
                if (!parsedCombos.isEmpty()) {
                    session.setComboItems(shouldAppendCombos(normalizedMessage)
                            ? mergeComboItems(session.getComboItems(), parsedCombos)
                            : parsedCombos);
                    session.setComboResolved(true);
                    session.setAwaitingConfirmation(false);
                }
            }
        }

        if (!session.isComboResolved()) {
            saveBookingSession(userId, session);
            return bookingResponse(
                    buildComboQuestion(comboSuggestions),
                    false,
                    "booking-collect-combos",
                    List.of(),
                    List.of(),
                    sessionId,
                    toBookingState(session, movieById),
                    comboSuggestions,
                    null,
                    null);
        }

        ChatBookingStateDTO bookingState = toBookingState(session, movieById);
        if (!session.isAwaitingConfirmation()) {
            session.setAwaitingConfirmation(true);
            bookingState = toBookingState(session, movieById);
            saveBookingSession(userId, session);
            return bookingResponse(
                    buildConfirmationReply(selectedMovie, selectedShowtime, bookingState),
                    false,
                    "booking-confirmation",
                    List.of(),
                    List.of(),
                    sessionId,
                    bookingState,
                    List.of(),
                    null,
                    null);
        }

        if (!containsConfirmIntent(normalizedMessage)) {
            saveBookingSession(userId, session);
            return bookingResponse(
                    "Mình đã gom đủ thông tin đặt vé rồi. Nếu mọi thứ đã đúng, bạn nhắn `xác nhận` để mình tạo QR PayOS. Nếu cần đổi, bạn cứ nhắn lại phim, suất chiếu, ghế hoặc combo.",
                    false,
                    "booking-await-confirmation",
                    List.of(),
                    List.of(),
                    sessionId,
                    bookingState,
                    List.of(),
                    null,
                    null);
        }

        try {
            ensureSeatHoldForPayment(selectedShowtime.getId(), session, userId);

            long totalAmount = calculateTotalAmount(session, seatStateByCode);
            PayOSCreateResponse payment = payOSService.createPaymentLink(
                    session.getHoldId(),
                    userId,
                    buildFrontendUrl("/payment/success"),
                    buildFrontendUrl("/payment/cancel"),
                    totalAmount,
                    null,
                    session.getComboItems(),
                    null,
                    null);

            session.setOrderCode(payment.getOrderCode());
            session.setAwaitingPayment(true);
            session.setAwaitingConfirmation(false);
            saveBookingSession(userId, session);

            return bookingResponse(
                    "Mình đã giữ ghế và tạo mã QR PayOS cho bạn. Bạn quét mã để chuyển khoản, sau đó nhắn `đã thanh toán` hoặc `xong` để mình chốt vé điện tử.",
                    false,
                    "booking-payment",
                    List.of(toMovieSuggestion(selectedMovie, 100)),
                    List.of(toShowtimeSuggestion(selectedShowtime, selectedMovie)),
                    sessionId,
                    toBookingState(session, movieById),
                    comboSuggestions,
                    payment,
                    null);
        } catch (Exception ex) {
            log.error("Chat booking payment creation failed", ex);
            rollbackBookingSession(userId, session);
            return fallbackResponse(
                    "Bước tạo giữ ghế hoặc QR thanh toán không thành công nên mình đã rollback toàn bộ phiên đặt vé. Bạn vui lòng thử lại từ đầu nhé.",
                    sessionId);
        }
    }

    private ChatResponse handlePendingPayment(ChatRequest request, String userId, BookingSession session,
            Map<Long, Movie> movieById) {
        String normalizedMessage = normalize(request.getMessage());

        try {
            boolean confirmed = payOSService.confirmPaymentWithProvider(session.getOrderCode());
            if (confirmed) {
                ETicketDTO ticket = invoiceService.getETicketByOrderCode(String.valueOf(session.getOrderCode()));
                clearBookingSession(userId, session.getSessionId());
                return bookingResponse(
                        "Thanh toán đã được ghi nhận. Đây là vé điện tử của bạn.",
                        false,
                        "booking-ticket",
                        movieSuggestionFromSession(session, movieById),
                        showtimeSuggestionFromSession(session, movieById),
                        session.getSessionId(),
                        ChatBookingStateDTO.builder().active(false).stage("COMPLETED").orderCode(session.getOrderCode())
                                .build(),
                        List.of(),
                        PayOSCreateResponse.builder().orderCode(session.getOrderCode()).status("PAID").build(),
                        ticket);
            }

            if (!containsPaidIntent(normalizedMessage)) {
                saveBookingSession(userId, session);
                return bookingResponse(
                        "Mình đang chờ xác nhận thanh toán cho đơn này. Sau khi chuyển khoản xong, bạn nhắn `đã thanh toán` để mình xuất vé điện tử.",
                        false,
                        "booking-await-payment",
                        movieSuggestionFromSession(session, movieById),
                        showtimeSuggestionFromSession(session, movieById),
                        session.getSessionId(),
                        toBookingState(session, movieById),
                        activeComboSuggestions(),
                        PayOSCreateResponse.builder().orderCode(session.getOrderCode()).status("PENDING").build(),
                        null);
            }

            saveBookingSession(userId, session);
            return bookingResponse(
                    "Mình chưa ghi nhận thanh toán PayOS cho đơn này. Bạn vui lòng kiểm tra lại giao dịch rồi nhắn `đã thanh toán` lần nữa giúp mình.",
                    false,
                    "booking-await-payment",
                    movieSuggestionFromSession(session, movieById),
                    showtimeSuggestionFromSession(session, movieById),
                    session.getSessionId(),
                    toBookingState(session, movieById),
                    activeComboSuggestions(),
                    PayOSCreateResponse.builder().orderCode(session.getOrderCode()).status("PENDING").build(),
                    null);
        } catch (Exception ex) {
            log.error("Chat booking payment confirmation failed", ex);
            rollbackBookingSession(userId, session);
            return fallbackResponse(
                    "Bước xác nhận thanh toán hoặc tạo vé điện tử không thành công nên mình đã rollback toàn bộ phiên đặt vé. Bạn vui lòng đặt lại giúp mình nhé.",
                    session.getSessionId());
        }
    }

    private ChatResponse handleAssistantConversation(ChatRequest request, String sessionId) {
        List<Movie> movies = getActiveMovies();
        Map<Long, Movie> movieById = movies.stream()
                .collect(Collectors.toMap(Movie::getId, movie -> movie));

        String mergedConversation = mergeConversation(request);
        String currentMessage = request.getMessage().trim();
        LocalDateTime now = LocalDateTime.now();
        UserPreference preference = extractUserPreference(currentMessage, now, movies);
        boolean movieListOnlyQuery = isMovieListOnlyQuery(currentMessage, preference);

        if (isSmallTalkOrOffTopic(currentMessage, movies)) {
            return ChatResponse.builder()
                    .reply(buildOutOfDomainReply(currentMessage))
                    .usedAi(false)
                    .source("out-of-domain")
                    .suggestedMovies(List.of())
                    .suggestedShowtimes(List.of())
                    .sessionId(sessionId)
                    .suggestedCombos(List.of())
                    .build();
        }

        List<Showtime> allUpcomingShowtimes = getUpcomingShowtimes(now, movieById, preference,
                preference.specificMovieId());
        List<Showtime> upcomingShowtimes = prioritizeBookingShowtimes(allUpcomingShowtimes, preference);
        Map<Long, Integer> movieScores = scoreMovies(currentMessage, movies, upcomingShowtimes, preference);

        List<Movie> filteredMovies = movies.stream()
                .filter(movie -> matchesGenrePreference(movie, preference))
                .filter(movie -> preference.specificMovieId() == null
                        || preference.specificMovieId().equals(movie.getId()))
                .collect(Collectors.toList());

        if (filteredMovies.isEmpty()) {
            filteredMovies = movies.stream()
                    .filter(movie -> preference.specificMovieId() == null
                            || preference.specificMovieId().equals(movie.getId()))
                    .collect(Collectors.toList());
        }

        List<Movie> rankedMovies = filteredMovies.stream()
                .sorted(Comparator
                        .comparingInt((Movie movie) -> movieScores.getOrDefault(movie.getId(), 0)).reversed()
                        .thenComparing((Movie movie) -> movie.getStatus() == MovieStatus.NOW_SHOWING ? 0 : 1)
                        .thenComparing(Movie::getTitle, String.CASE_INSENSITIVE_ORDER))
                .limit(MAX_MOVIE_CONTEXT)
                .collect(Collectors.toList());

        Set<Long> initialRankedMovieIds = rankedMovies.stream()
                .map(Movie::getId)
                .collect(Collectors.toCollection(HashSet::new));

        List<Showtime> rankedShowtimes = upcomingShowtimes.stream()
                .filter(showtime -> initialRankedMovieIds.contains(showtime.getMovieId()))
                .sorted(Comparator
                        .comparingInt((Showtime showtime) -> movieScores.getOrDefault(showtime.getMovieId(), 0))
                        .reversed()
                        .thenComparing(Showtime::getStartTime))
                .limit(MAX_SHOWTIME_CONTEXT)
                .collect(Collectors.toList());

        if (preference.specificMovieId() != null) {
            rankedShowtimes = rankedShowtimes.stream()
                    .sorted(Comparator.comparing(Showtime::getStartTime))
                    .limit(MAX_FINAL_SUGGESTIONS)
                    .collect(Collectors.toList());
        } else if (preference.targetTime() != null
                || preference.timeFrom() != null
                || preference.preferredDate() != null
                || preference.preferredWeekday() != null) {
            rankedShowtimes = rankedShowtimes.stream()
                    .sorted(Comparator.comparing(Showtime::getStartTime))
                    .limit(Math.max(MAX_FINAL_SUGGESTIONS * 2, MAX_FINAL_SUGGESTIONS))
                    .collect(Collectors.toList());

            LinkedHashSet<Long> showtimeMovieIds = rankedShowtimes.stream()
                    .map(Showtime::getMovieId)
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            List<Showtime> finalRankedShowtimes = rankedShowtimes;
            rankedMovies = rankedMovies.stream()
                    .filter(movie -> showtimeMovieIds.contains(movie.getId()))
                    .sorted(Comparator.comparing(
                            movie -> finalRankedShowtimes.stream()
                                    .filter(showtime -> Objects.equals(showtime.getMovieId(), movie.getId()))
                                    .map(Showtime::getStartTime)
                                    .min(LocalDateTime::compareTo)
                                    .orElse(LocalDateTime.MAX)))
                    .limit(MAX_MOVIE_CONTEXT)
                    .collect(Collectors.toList());
        }

        List<ChatMovieSuggestionDTO> candidateMovies = rankedMovies.stream()
                .map(movie -> toMovieSuggestion(movie, movieScores.getOrDefault(movie.getId(), 0)))
                .collect(Collectors.toList());

        List<ChatShowtimeSuggestionDTO> candidateShowtimes = rankedShowtimes.stream()
                .map(showtime -> toShowtimeSuggestion(showtime, movieById.get(showtime.getMovieId())))
                .collect(Collectors.toList());

        if (movieListOnlyQuery) {
            List<ChatMovieSuggestionDTO> movieListSuggestions = allUpcomingShowtimes.stream()
                    .sorted(Comparator.comparing(Showtime::getStartTime))
                    .map(Showtime::getMovieId)
                    .distinct()
                    .map(movieById::get)
                    .filter(Objects::nonNull)
                    .map(movie -> toMovieSuggestion(movie, movieScores.getOrDefault(movie.getId(), 0)))
                    .collect(Collectors.toList());

            return ChatResponse.builder()
                    .reply(buildMovieOnlyReply(currentMessage, movieListSuggestions, preference))
                    .usedAi(false)
                    .source("local-movie-list")
                    .suggestedMovies(movieListSuggestions)
                    .suggestedShowtimes(List.of())
                    .sessionId(sessionId)
                    .suggestedCombos(List.of())
                    .build();
        }

        Map<Long, ChatMovieSuggestionDTO> candidateMovieMap = candidateMovies.stream()
                .collect(Collectors.toMap(ChatMovieSuggestionDTO::getId, movie -> movie, (left, right) -> left,
                        LinkedHashMap::new));
        Map<Long, ChatShowtimeSuggestionDTO> candidateShowtimeMap = candidateShowtimes.stream()
                .collect(Collectors.toMap(ChatShowtimeSuggestionDTO::getId, showtime -> showtime, (left, right) -> left,
                        LinkedHashMap::new));

        LocalDate targetDate = resolveTargetDate(preference, allUpcomingShowtimes);
        GeminiResult geminiResult = geminiClient.generateReply(
                buildSystemInstruction(),
                buildPrompts(request,
                        buildDatabaseContext(candidateMovies, candidateShowtimes, now, preference, targetDate)));

        if (geminiResult != null && geminiResult.success()) {
            GeminiDecision decision = parseGeminiDecision(geminiResult.text());
            if (decision != null && decision.reply() != null && !decision.reply().isBlank()) {
                return ChatResponse.builder()
                        .reply(decision.reply().trim())
                        .usedAi(true)
                        .source("gemini-structured")
                        .suggestedMovies(selectMovies(decision.movieIds(), candidateMovieMap))
                        .suggestedShowtimes(selectShowtimes(decision.showtimeIds(), candidateShowtimeMap))
                        .sessionId(sessionId)
                        .suggestedCombos(List.of())
                        .build();
            }
        }

        List<ChatMovieSuggestionDTO> fallbackMovies = candidateMovies.stream().limit(MAX_FINAL_SUGGESTIONS).toList();
        List<ChatShowtimeSuggestionDTO> fallbackShowtimes = candidateShowtimes.stream().limit(MAX_FINAL_SUGGESTIONS)
                .toList();

        return ChatResponse.builder()
                .reply(buildFallbackReply(request.getMessage(), fallbackMovies, fallbackShowtimes,
                        geminiResult == null ? "Gemini unavailable" : geminiResult.errorMessage()))
                .usedAi(false)
                .source("local-fallback")
                .suggestedMovies(fallbackMovies)
                .suggestedShowtimes(fallbackShowtimes)
                .sessionId(sessionId)
                .suggestedCombos(List.of())
                .build();
    }

    private void refreshMovieStatuses() {
        LocalDate today = LocalDate.now();
        movieRepository.markStoppedMovies(today);
        movieRepository.markComingSoonMovies(today);
        movieRepository.markNowShowingMovies(today);
    }

    private List<Movie> getActiveMovies() {
        return movieRepository.findAll().stream()
                .filter(movie -> movie.getStatus() != MovieStatus.STOPPED)
                .collect(Collectors.toList());
    }

    private List<Showtime> getUpcomingShowtimes(LocalDateTime now, Map<Long, Movie> movieById,
            UserPreference preference, Long specificMovieId) {
        List<Showtime> base = showtimeRepository.findAll().stream()
                .filter(showtime -> showtime.getStatus() == ShowtimeStatus.OPEN)
                .filter(showtime -> showtime.getStartTime() != null && showtime.getStartTime().isAfter(now))
                .filter(showtime -> movieById.containsKey(showtime.getMovieId()))
                .filter(showtime -> specificMovieId == null || specificMovieId.equals(showtime.getMovieId()))
                .collect(Collectors.toList());

        LocalDate targetDate = resolveTargetDate(preference, base);
        return base.stream()
                .filter(showtime -> matchesTimePreference(showtime, preference, targetDate))
                .sorted(Comparator.comparing(Showtime::getStartTime))
                .collect(Collectors.toList());
    }

    private List<Showtime> prioritizeBookingShowtimes(List<Showtime> showtimes, UserPreference preference) {
        if (preference.targetTime() != null) {
            List<Showtime> prioritized = prioritizeShowtimesAroundTargetTime(showtimes, preference.targetTime());
            if (!hasExactShowtimeMatch(showtimes, preference.targetTime()) && !prioritized.isEmpty()) {
                return List.of(prioritized.get(0));
            }
            return prioritized;
        }
        return showtimes.stream().sorted(Comparator.comparing(Showtime::getStartTime)).toList();
    }

    private ChatResponse bookingResponse(String reply, boolean usedAi, String source,
            List<ChatMovieSuggestionDTO> suggestedMovies,
            List<ChatShowtimeSuggestionDTO> suggestedShowtimes,
            String sessionId,
            ChatBookingStateDTO bookingState,
            List<ComboCartItemDTO> suggestedCombos,
            PayOSCreateResponse payment,
            ETicketDTO ticket) {
        return ChatResponse.builder()
                .reply(reply)
                .usedAi(usedAi)
                .source(source)
                .suggestedMovies(suggestedMovies)
                .suggestedShowtimes(suggestedShowtimes)
                .sessionId(sessionId)
                .bookingState(bookingState)
                .suggestedCombos(suggestedCombos)
                .payment(payment)
                .ticket(ticket)
                .build();
    }

    private ChatResponse fallbackResponse(String reply, String sessionId) {
        return ChatResponse.builder()
                .reply(reply)
                .usedAi(false)
                .source("booking-fallback")
                .suggestedMovies(List.of())
                .suggestedShowtimes(List.of())
                .sessionId(sessionId)
                .suggestedCombos(List.of())
                .build();
    }

    private String resolveSessionId(ChatRequest request) {
        if (request.getSessionId() != null && !request.getSessionId().isBlank()) {
            return request.getSessionId().trim();
        }
        return UUID.randomUUID().toString();
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

    private String mergeUserConversation(ChatRequest request) {
        List<String> parts = new ArrayList<>();
        if (request.getHistory() != null) {
            request.getHistory().stream()
                    .filter(message -> "user".equalsIgnoreCase(message.getRole()))
                    .filter(message -> message.getContent() != null && !message.getContent().isBlank())
                    .forEach(message -> parts.add(message.getContent().trim()));
        }
        parts.add(request.getMessage().trim());
        return String.join(" ", parts);
    }

    private boolean isBookingIntent(String normalizedMessage) {
        return containsConfigured(normalizedMessage, "BOOKING");
    }

    private boolean shouldExitBookingFlow(BookingSession session, String normalizedMessage) {
        if (session == null || normalizedMessage == null || normalizedMessage.isBlank()) {
            return false;
        }
        if (containsCancelIntent(normalizedMessage)
                || containsConfirmIntent(normalizedMessage)
                || containsPaidIntent(normalizedMessage)
                || isBookingIntent(normalizedMessage)
                || containsComboSkipIntent(normalizedMessage)
                || SEAT_CODE_PATTERN.matcher(normalizedMessage).find()) {
            return false;
        }
        return isInformationalShowtimeQuery(normalizedMessage);
    }

    private boolean isInformationalShowtimeQuery(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of(
                "suat chieu nao",
                "cac suat chieu",
                "co nhung suat chieu",
                "lich chieu",
                "gio chieu",
                "may suat"));
    }

    private boolean containsCancelIntent(String normalizedMessage) {
        return containsConfigured(normalizedMessage, "CANCEL");
    }

    private boolean containsConfirmIntent(String normalizedMessage) {
        return containsConfigured(normalizedMessage, "CONFIRM");
    }

    private boolean containsPaidIntent(String normalizedMessage) {
        return containsConfigured(normalizedMessage, "PAID");
    }

    private boolean containsComboSkipIntent(String normalizedMessage) {
        return containsConfigured(normalizedMessage, "SKIP_COMBO");
    }

    private List<ChatMovieSuggestionDTO> suggestMoviesForBooking(String mergedConversation, List<Movie> movies) {
        UserPreference preference = extractUserPreference(mergedConversation, LocalDateTime.now(), movies);
        List<Showtime> upcomingShowtimes = showtimeRepository.findAll().stream()
                .filter(showtime -> showtime.getStatus() == ShowtimeStatus.OPEN)
                .filter(showtime -> showtime.getStartTime() != null
                        && showtime.getStartTime().isAfter(LocalDateTime.now()))
                .collect(Collectors.toList());
        Map<Long, Integer> scores = scoreMovies(mergedConversation, movies, upcomingShowtimes, preference);

        return movies.stream()
                .filter(movie -> movie.getStatus() == MovieStatus.NOW_SHOWING
                        || movie.getStatus() == MovieStatus.COMING_SOON)
                .sorted(Comparator.comparingInt((Movie movie) -> scores.getOrDefault(movie.getId(), 0)).reversed())
                .limit(MAX_FINAL_SUGGESTIONS)
                .map(movie -> toMovieSuggestion(movie, scores.getOrDefault(movie.getId(), 0)))
                .collect(Collectors.toList());
    }

    private String buildMovieQuestion(List<ChatMovieSuggestionDTO> candidates) {
        if (candidates.isEmpty()) {
            return "Bạn muốn đặt vé phim nào? Bạn có thể nhắn tên phim đang chiếu hoặc phim sắp chiếu mà bạn quan tâm.";
        }
        return "Bạn muốn đặt vé phim nào? Hiện mình đang ưu tiên các phim: "
                + candidates.stream().map(ChatMovieSuggestionDTO::getTitle).collect(Collectors.joining(", ")) + ".";
    }

    private String buildShowtimeQuestion(Movie movie, List<ChatShowtimeSuggestionDTO> showtimes) {
        return "Mình đã ghi nhận phim " + movie.getTitle()
                + ". Bạn muốn xem suất nào? Bạn có thể trả lời theo giờ/ngày, ví dụ `tối mai 21h` hoặc chọn một trong các suất gợi ý bên dưới.";
    }

    private String buildShowtimePrompt(Movie movie, List<ChatShowtimeSuggestionDTO> showtimes,
            UserPreference preference, boolean exactShowtimeMatch) {
        if (showtimes.isEmpty()) {
            return "Hiện mình chưa thấy suất chiếu phù hợp cho phim " + movie.getTitle()
                    + ". Bạn có thể đổi ngày/giờ khác hoặc chọn phim khác.";
        }
        if (preference.targetTime() != null && !exactShowtimeMatch) {
            ChatShowtimeSuggestionDTO nearestShowtime = showtimes.get(0);
            return "Hiện không có suất " + preference.targetTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                    + " cho phim " + movie.getTitle() + ". Suất gần nhất mình tìm thấy là lúc "
                    + nearestShowtime.getStartTime().format(SHOWTIME_FORMATTER)
                    + ". Bạn có thể chọn suất này hoặc nhắn giờ khác giúp mình.";
        }
        return buildShowtimeQuestion(movie, showtimes);
    }

    private String buildSeatQuestion(Movie movie, Showtime showtime, Map<String, SeatStateDto> availableSeatMap) {
        String seatPreview = availableSeatMap.keySet().stream().limit(8).collect(Collectors.joining(", "));
        if (seatPreview.isBlank()) {
            return "Suất " + movie.getTitle() + " lúc " + showtime.getStartTime().format(SHOWTIME_FORMATTER)
                    + " hiện không còn ghế trống phù hợp. Bạn muốn đổi suất khác không?";
        }
        return "Bạn muốn chọn ghế nào cho suất " + movie.getTitle() + " lúc "
                + showtime.getStartTime().format(SHOWTIME_FORMATTER)
                + "? Ví dụ: A1 A2. Một vài ghế còn trống là " + seatPreview + ".";
    }

    private String buildComboQuestion(List<ComboCartItemDTO> comboSuggestions) {
        if (comboSuggestions.isEmpty()) {
            return "Hiện mình chưa thấy combo bắp nước đang bán. Nếu bạn không cần combo, chỉ cần trả lời `không` để mình sang bước xác nhận.";
        }
        String comboList = java.util.stream.IntStream.range(0, comboSuggestions.size())
                .mapToObj(i -> {
                    ComboCartItemDTO combo = comboSuggestions.get(i);
                    return (i + 1) + ". " + combo.getName() + " (" + formatMoney(combo.getPrice().longValue()) + ")";
                })
                .collect(Collectors.joining("\n"));
        return "Bạn có muốn thêm bắp nước không? Hiện có các combo sau:\n"
                + comboList
                + "\nBạn có thể nhắn theo số thứ tự, ví dụ `2 combo 1` hoặc `combo 1`."
                + "\nBạn vẫn có thể nhắn theo tên đầy đủ, ví dụ `1 " + comboSuggestions.get(0).getName()
                + "`; nếu không cần thì chỉ cần trả lời `không`.";
    }

    private String buildConfirmationReply(Movie movie, Showtime showtime, ChatBookingStateDTO state) {
        String combos = (state.getComboItems() == null || state.getComboItems().isEmpty())
                ? "Không lấy combo"
                : state.getComboItems().stream().map(item -> item.getQuantity() + "x " + item.getName())
                        .collect(Collectors.joining(", "));

        return "Mình đã thu thập đủ thông tin. Bạn kiểm tra lại giúp mình:\n"
                + "- Phim: " + movie.getTitle() + "\n"
                + "- Suất chiếu: " + showtime.getStartTime().format(SHOWTIME_FORMATTER) + "\n"
                + "- Ghế: " + String.join(", ", state.getSeatCodes()) + "\n"
                + "- Combo: " + combos + "\n"
                + "- Tổng tiền dự kiến: " + formatMoney(state.getTotalAmount()) + "\n"
                + "Nếu đúng rồi, bạn nhắn `xác nhận` để mình tạo QR PayOS.";
    }

    private Long detectShowtimeSelection(BookingSession session, List<Showtime> prioritizedShowtimes,
            UserPreference preference, String normalizedMessage) {
        if (session.getShowtimeId() != null) {
            return session.getShowtimeId();
        }
        if (prioritizedShowtimes.isEmpty()) {
            return null;
        }
        if (mentionsSuggestedShowtimeSelection(normalizedMessage)) {
            return prioritizedShowtimes.get(0).getId();
        }
        if (preference.targetTime() != null && !hasExactShowtimeMatch(prioritizedShowtimes, preference.targetTime())) {
            return null;
        }
        if (preference.targetTime() != null || prioritizedShowtimes.size() == 1) {
            return prioritizedShowtimes.get(0).getId();
        }
        return null;
    }

    private boolean mentionsSuggestedShowtimeSelection(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of(
                "suat do",
                "suat nay",
                "suat chieu do",
                "suat chieu nay",
                "xem ghe suat do",
                "xem ghe suat nay",
                "dat ve suat do",
                "dat ve suat nay",
                "dat suat do",
                "dat suat nay"));
    }

    private boolean containsContinueIntent(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of("tiep tuc", "continue"));
    }

    private boolean isOffTopicDuringBooking(String rawMessage, String normalizedMessage, List<Movie> movies) {
        if (normalizedMessage == null || normalizedMessage.isBlank()) {
            return false;
        }
        if (containsContinueIntent(normalizedMessage) || containsCancelIntent(normalizedMessage)
                || containsConfirmIntent(normalizedMessage) || containsPaidIntent(normalizedMessage)
                || containsComboSkipIntent(normalizedMessage) || mentionsSeatChange(normalizedMessage)
                || mentionsSeatRemoval(normalizedMessage) || mentionsComboChange(normalizedMessage)
                || mentionsComboRemoval(normalizedMessage) || mentionsComboSkip(normalizedMessage)
                || mentionsSuggestedShowtimeSelection(normalizedMessage)) {
            return false;
        }
        if (!parseSeatCodesFromMessage(rawMessage).isEmpty()) {
            return false;
        }
        if (extractTargetTime(normalizedMessage) != null) {
            return false;
        }
        if (extractSpecificMovieId(normalizedMessage, movies) != null) {
            return false;
        }
        return !containsAny(normalizedMessage, List.of(
                "dat", "ve", "phim", "suat", "chieu", "ghe", "combo",
                "chon", "doi", "them", "bo", "thanh toan", "payos"));
    }

    private List<Long> parseSeatIdsFromMessage(String rawMessage, Map<String, SeatStateDto> availableSeatMap,
            boolean requireAvailablePair) {
        Map<Long, SeatStateDto> seatById = availableSeatMap.values().stream()
                .collect(Collectors.toMap(SeatStateDto::getSeatId, seat -> seat, (left, right) -> left));
        LinkedHashSet<Long> seatIds = new LinkedHashSet<>();
        for (String code : parseSeatCodesFromMessage(rawMessage)) {
            SeatStateDto seat = availableSeatMap.get(code);
            if (seat != null) {
                if (seat.getPairedSeatId() != null) {
                    SeatStateDto pairedSeat = seatById.get(seat.getPairedSeatId());
                    if (requireAvailablePair && pairedSeat == null) {
                        continue;
                    }
                    seatIds.add(seat.getSeatId());
                    if (pairedSeat != null) {
                        seatIds.add(pairedSeat.getSeatId());
                    }
                } else {
                    seatIds.add(seat.getSeatId());
                }
            }
        }
        return new ArrayList<>(seatIds);
    }

    private List<String> parseSeatCodesFromMessage(String rawMessage) {
        Matcher matcher = SEAT_CODE_PATTERN.matcher(rawMessage == null ? "" : rawMessage);
        LinkedHashSet<String> seatCodes = new LinkedHashSet<>();
        while (matcher.find()) {
            seatCodes.add(matcher.group(1).toUpperCase(Locale.ROOT) + matcher.group(2));
        }
        return new ArrayList<>(seatCodes);
    }

    private String buildSeatValidationWarning(List<String> parsedSeatCodes, List<String> soldSeatCodes,
            List<String> heldSeatCodes, List<String> unknownSeatCodes) {
        if (parsedSeatCodes == null || parsedSeatCodes.isEmpty()) {
            return null;
        }

        List<String> notices = new ArrayList<>();
        if (soldSeatCodes != null && !soldSeatCodes.isEmpty()) {
            notices.add("Ghế " + String.join(", ", soldSeatCodes) + " đã được bán.");
        }
        if (heldSeatCodes != null && !heldSeatCodes.isEmpty()) {
            notices.add("Ghế " + String.join(", ", heldSeatCodes) + " đang được giữ.");
        }
        if (unknownSeatCodes != null && !unknownSeatCodes.isEmpty()) {
            notices.add("Không tìm thấy ghế: " + String.join(", ", unknownSeatCodes) + ".");
        }

        if (notices.isEmpty()) {
            return null;
        }
        return String.join(" ", notices) + " Bạn vui lòng chọn ghế khác còn trống.";
    }

    private boolean shouldAppendSeats(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of("them ghe", "them cho"));
    }

    private boolean mentionsSeatRemoval(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of("bo ghe", "bo bot ghe", "xoa ghe", "xoa bot ghe"));
    }

    private boolean mentionsSeatChange(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of(
                "doi ghe",
                "chon lai ghe",
                "chon lai cho",
                "doi cho",
                "doi vi tri"));
    }

    private List<Long> mergeSeatIds(List<Long> currentSeatIds, List<Long> addedSeatIds) {
        LinkedHashSet<Long> merged = new LinkedHashSet<>();
        if (currentSeatIds != null) {
            merged.addAll(currentSeatIds);
        }
        merged.addAll(addedSeatIds);
        return new ArrayList<>(merged);
    }

    private List<Long> removeSeatIds(List<Long> currentSeatIds, List<Long> removedSeatIds) {
        LinkedHashSet<Long> remaining = new LinkedHashSet<>();
        if (currentSeatIds != null) {
            remaining.addAll(currentSeatIds);
        }
        if (removedSeatIds != null) {
            remaining.removeAll(removedSeatIds);
        }
        return new ArrayList<>(remaining);
    }

    private List<ComboCartItemDTO> activeComboSuggestions() {
        return comboRepository.findByStatus("ACTIVE").stream()
                .filter(combo -> combo.getStockQuantity() != null && combo.getStockQuantity() > 0)
                .sorted(Comparator.comparing(Combo::getName, String.CASE_INSENSITIVE_ORDER))
                .map(combo -> new ComboCartItemDTO(combo.getId(), combo.getName(), 1, combo.getPrice(),
                        combo.getPrice()))
                .collect(Collectors.toList());
    }

    private List<ComboCartItemDTO> parseCombosFromMessage(String rawMessage, List<ComboCartItemDTO> suggestions) {
        String normalizedMessage = normalize(rawMessage);
        Map<Long, ComboCartItemDTO> parsedById = new LinkedHashMap<>();

        Matcher comboIndexMatcher = COMBO_INDEX_SELECTION_PATTERN.matcher(normalizedMessage);
        while (comboIndexMatcher.find()) {
            int quantity = comboIndexMatcher.group(1) == null ? 1
                    : Math.max(Integer.parseInt(comboIndexMatcher.group(1)), 1);
            int comboIndex = Integer.parseInt(comboIndexMatcher.group(2));
            if (comboIndex < 1 || comboIndex > suggestions.size()) {
                continue;
            }
            ComboCartItemDTO suggestion = suggestions.get(comboIndex - 1);
            appendParsedCombo(parsedById, suggestion, quantity);
        }

        for (ComboCartItemDTO suggestion : suggestions) {
            String normalizedName = normalize(suggestion.getName());
            if (!normalizedMessage.contains(normalizedName)) {
                continue;
            }

            int quantity = extractQuantityForCombo(normalizedMessage, normalizedName);
            appendParsedCombo(parsedById, suggestion, quantity);
        }
        return new ArrayList<>(parsedById.values());
    }

    private void appendParsedCombo(Map<Long, ComboCartItemDTO> parsedById, ComboCartItemDTO suggestion, int quantity) {
        if (suggestion == null || suggestion.getComboId() == null) {
            return;
        }
        int safeQuantity = Math.max(quantity, 1);
        ComboCartItemDTO existing = parsedById.get(suggestion.getComboId());
        int totalQuantity = safeQuantity;
        if (existing != null && existing.getQuantity() != null) {
            totalQuantity += existing.getQuantity();
        }
        BigDecimal subtotal = suggestion.getPrice() == null
                ? null
                : suggestion.getPrice().multiply(BigDecimal.valueOf(totalQuantity));
        parsedById.put(suggestion.getComboId(), new ComboCartItemDTO(
                suggestion.getComboId(),
                suggestion.getName(),
                totalQuantity,
                suggestion.getPrice(),
                subtotal));
    }

    private boolean shouldAppendCombos(String normalizedMessage) {
        return normalizedMessage != null
                && (normalizedMessage.startsWith("them ")
                        || normalizedMessage.contains(" them ")
                        || normalizedMessage.contains("them combo")
                        || normalizedMessage.contains("them bap")
                        || normalizedMessage.contains("them nuoc"));
    }

    private boolean mentionsComboSkip(String normalizedMessage) {
        return normalizedMessage != null
                && containsComboSkipIntent(normalizedMessage)
                && containsAny(normalizedMessage, List.of("combo", "bap", "nuoc"));
    }

    private boolean mentionsComboChange(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of(
                "doi combo",
                "chon lai combo",
                "doi bap nuoc",
                "chon lai bap nuoc"));
    }

    private boolean mentionsComboRemoval(String normalizedMessage) {
        return containsAny(normalizedMessage, List.of(
                "bo combo",
                "bo bot combo",
                "xoa combo",
                "xoa bot combo",
                "bo bap",
                "bo nuoc",
                "bot combo"));
    }

    private List<ComboCartItemDTO> mergeComboItems(List<ComboCartItemDTO> currentItems,
            List<ComboCartItemDTO> addedItems) {
        Map<Long, ComboCartItemDTO> merged = new LinkedHashMap<>();
        if (currentItems != null) {
            for (ComboCartItemDTO item : currentItems) {
                merged.put(item.getComboId(), new ComboCartItemDTO(
                        item.getComboId(),
                        item.getName(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getSubtotal()));
            }
        }
        for (ComboCartItemDTO item : addedItems) {
            ComboCartItemDTO existing = merged.get(item.getComboId());
            if (existing == null) {
                merged.put(item.getComboId(), item);
                continue;
            }
            int quantity = (existing.getQuantity() == null ? 0 : existing.getQuantity())
                    + (item.getQuantity() == null ? 0 : item.getQuantity());
            BigDecimal price = existing.getPrice() != null ? existing.getPrice() : item.getPrice();
            merged.put(item.getComboId(), new ComboCartItemDTO(
                    item.getComboId(),
                    item.getName(),
                    quantity,
                    price,
                    price == null ? null : price.multiply(BigDecimal.valueOf(quantity))));
        }
        return new ArrayList<>(merged.values());
    }

    private List<ComboCartItemDTO> removeComboItems(List<ComboCartItemDTO> currentItems,
            List<ComboCartItemDTO> removedItems,
            String normalizedMessage) {
        Map<Long, ComboCartItemDTO> remaining = new LinkedHashMap<>();
        if (currentItems != null) {
            for (ComboCartItemDTO item : currentItems) {
                remaining.put(item.getComboId(), new ComboCartItemDTO(
                        item.getComboId(),
                        item.getName(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getSubtotal()));
            }
        }
        for (ComboCartItemDTO item : removedItems) {
            ComboCartItemDTO existing = remaining.get(item.getComboId());
            if (existing == null) {
                continue;
            }
            Integer removalQuantity = item.getQuantity() == null ? 0 : item.getQuantity();
            if (removalQuantity <= 0 || shouldRemoveEntireCombo(normalizedMessage)) {
                remaining.remove(item.getComboId());
                continue;
            }
            int nextQuantity = (existing.getQuantity() == null ? 0 : existing.getQuantity()) - removalQuantity;
            if (nextQuantity <= 0) {
                remaining.remove(item.getComboId());
                continue;
            }
            BigDecimal price = existing.getPrice();
            remaining.put(item.getComboId(), new ComboCartItemDTO(
                    existing.getComboId(),
                    existing.getName(),
                    nextQuantity,
                    price,
                    price == null ? null : price.multiply(BigDecimal.valueOf(nextQuantity))));
        }
        return new ArrayList<>(remaining.values());
    }

    private boolean shouldRemoveEntireCombo(String normalizedMessage) {
        return normalizedMessage != null && !NUMBER_PATTERN.matcher(normalizedMessage).find();
    }

    private int extractQuantityForCombo(String normalizedMessage, String normalizedComboName) {
        String[] tokens = normalizedComboName.split(" ");
        String anchor = tokens.length == 0 ? normalizedComboName : tokens[0];
        Pattern pattern = Pattern.compile("(\\d+)\\s*(?:x|phan|combo)?\\s*" + Pattern.quote(anchor));
        Matcher matcher = pattern.matcher(normalizedMessage);
        if (matcher.find()) {
            return Math.max(Integer.parseInt(matcher.group(1)), 1);
        }

        Matcher fallback = NUMBER_PATTERN.matcher(normalizedMessage);
        if (fallback.find()) {
            return Math.max(Integer.parseInt(fallback.group(1)), 1);
        }
        return 1;
    }

    private long calculateTotalAmount(BookingSession session, Map<String, SeatStateDto> availableSeatMap) {
        long seatTotal = 0L;
        Set<Long> selectedSeatIds = session.getSeatIds() == null ? Set.of() : new HashSet<>(session.getSeatIds());
        for (SeatStateDto seat : availableSeatMap.values()) {
            if (selectedSeatIds.contains(seat.getSeatId()) && seat.getFinalPrice() != null) {
                seatTotal += seat.getFinalPrice().longValue();
            }
        }

        long comboTotal = 0L;
        if (session.getComboItems() != null) {
            for (ComboCartItemDTO combo : session.getComboItems()) {
                if (combo.getSubtotal() != null) {
                    comboTotal += combo.getSubtotal().longValue();
                }
            }
        }
        return seatTotal + comboTotal;
    }

    private ChatBookingStateDTO toBookingState(BookingSession session, Map<Long, Movie> movieById) {
        if (session == null || !session.isActive()) {
            return ChatBookingStateDTO.builder().active(false).build();
        }

        Movie movie = session.getMovieId() == null ? null : movieById.get(session.getMovieId());
        Showtime showtime = session.getShowtimeId() == null ? null
                : showtimeRepository.findById(session.getShowtimeId()).orElse(null);
        List<String> seatCodes = new ArrayList<>();
        long totalAmount = 0L;
        List<SeatStateDto> seatMap = List.of();
        Integer totalColumns = null;

        if (showtime != null) {
            seatMap = seatHoldService.getSeatStates(showtime.getId());
            totalColumns = seatMap.stream()
                    .map(SeatStateDto::getColumnNumber)
                    .filter(Objects::nonNull)
                    .max(Integer::compareTo)
                    .orElse(null);
        }

        if (showtime != null && session.getSeatIds() != null && !session.getSeatIds().isEmpty()) {
            Map<Long, SeatStateDto> seatById = seatMap.stream()
                    .collect(Collectors.toMap(SeatStateDto::getSeatId, seat -> seat, (left, right) -> left));
            for (Long seatId : session.getSeatIds()) {
                SeatStateDto seat = seatById.get(seatId);
                if (seat != null) {
                    seatCodes.add(seatCode(seat));
                    if (seat.getFinalPrice() != null) {
                        totalAmount += seat.getFinalPrice().longValue();
                    }
                }
            }
        }

        if (session.getComboItems() != null) {
            for (ComboCartItemDTO combo : session.getComboItems()) {
                if (combo.getSubtotal() != null) {
                    totalAmount += combo.getSubtotal().longValue();
                }
            }
        }

        return ChatBookingStateDTO.builder()
                .active(true)
                .stage(resolveStage(session))
                .movieId(session.getMovieId())
                .movieTitle(movie == null ? null : movie.getTitle())
                .showtimeId(session.getShowtimeId())
                .showtimeStartTime(showtime == null ? null : showtime.getStartTime())
                .seatCodes(seatCodes)
                .totalColumns(totalColumns)
                .seatMap(seatMap)
                .comboItems(session.getComboItems() == null ? List.of() : session.getComboItems())
                .totalAmount(totalAmount)
                .awaitingConfirmation(session.isAwaitingConfirmation())
                .awaitingPayment(session.isAwaitingPayment())
                .orderCode(session.getOrderCode())
                .build();
    }

    private String resolveStage(BookingSession session) {
        if (session.isAwaitingPayment()) {
            return "AWAITING_PAYMENT";
        }
        if (session.isAwaitingConfirmation()) {
            return "AWAITING_CONFIRMATION";
        }
        if (session.getMovieId() == null) {
            return "COLLECTING_MOVIE";
        }
        if (session.getShowtimeId() == null) {
            return "COLLECTING_SHOWTIME";
        }
        if (session.getSeatIds() == null || session.getSeatIds().isEmpty()) {
            return "COLLECTING_SEATS";
        }
        if (!session.isComboResolved()) {
            return "COLLECTING_COMBOS";
        }
        return "READY_TO_CONFIRM";
    }

    private boolean sameSeatSelection(List<Long> first, List<Long> second) {
        List<Long> left = first == null ? List.of() : first;
        List<Long> right = second == null ? List.of() : second;
        return new LinkedHashSet<>(left).equals(new LinkedHashSet<>(right));
    }

    private void clearPendingPaymentState(BookingSession session) {
        session.setAwaitingPayment(false);
        session.setOrderCode(null);
    }

    private void releaseCurrentHoldQuietly(BookingSession session, String userId) {
        if (session == null || session.getHoldId() == null || session.getHoldId().isBlank()) {
            return;
        }
        try {
            seatHoldService.releaseHold(session.getHoldId(), userId);
        } catch (Exception ex) {
            log.warn("Failed to release chat booking hold {}", session.getHoldId(), ex);
        } finally {
            session.setHoldId(null);
            clearPendingPaymentState(session);
        }
    }

    private void replaceSeatHold(Long showtimeId, BookingSession session, String userId) {
        releaseCurrentHoldQuietly(session, userId);
        HoldResponse hold = seatHoldService.holdSeats(showtimeId, session.getSeatIds(), userId);
        session.setHoldId(hold.getHoldId());
        clearPendingPaymentState(session);
    }

    private void ensureSeatHoldForPayment(Long showtimeId, BookingSession session, String userId) {
        if (session.getSeatIds() == null || session.getSeatIds().isEmpty()) {
            throw new IllegalStateException("Không có ghế để giữ trước khi thanh toán");
        }

        if (session.getHoldId() == null || session.getHoldId().isBlank()) {
            HoldResponse hold = seatHoldService.holdSeats(showtimeId, session.getSeatIds(), userId);
            session.setHoldId(hold.getHoldId());
            return;
        }

        try {
            seatHoldService.renewHold(session.getHoldId(), userId);
        } catch (Exception ex) {
            HoldResponse hold = seatHoldService.holdSeats(showtimeId, session.getSeatIds(), userId);
            session.setHoldId(hold.getHoldId());
        }
    }

    private void clearShowtimeSelection(BookingSession session) {
        session.setShowtimeId(null);
        session.setSeatIds(new ArrayList<>());
        session.setComboItems(new ArrayList<>());
        session.setComboResolved(false);
        session.setAwaitingConfirmation(false);
        session.setAwaitingPayment(false);
        session.setHoldId(null);
        session.setOrderCode(null);
    }

    private void rollbackBookingSession(String userId, BookingSession session) {
        if (session == null) {
            return;
        }
        try {
            if (session.getHoldId() != null && !session.getHoldId().isBlank()) {
                seatHoldService.releaseHold(session.getHoldId(), userId);
            }
        } catch (Exception ex) {
            log.warn("Failed to release chat booking hold {}", session.getHoldId(), ex);
        }
        clearBookingSession(userId, session.getSessionId());
    }

    private void saveBookingSession(String userId, BookingSession session) {
        try {
            redisTemplate.opsForValue().set(
                    bookingSessionKey(userId, session.getSessionId()),
                    objectMapper.writeValueAsString(session),
                    Duration.ofMinutes(BOOKING_SESSION_TTL_MINUTES));
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể lưu trạng thái chat đặt vé", ex);
        }
    }

    private BookingSession loadBookingSession(String userId, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        String raw = redisTemplate.opsForValue().get(bookingSessionKey(userId, sessionId));
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(raw, BookingSession.class);
        } catch (Exception ex) {
            log.warn("Failed to parse chat booking session {}", sessionId, ex);
            clearBookingSession(userId, sessionId);
            return null;
        }
    }

    private void clearBookingSession(String userId, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        redisTemplate.delete(bookingSessionKey(userId, sessionId));
    }

    private String bookingSessionKey(String userId, String sessionId) {
        return "chat:booking:" + userId + ":" + sessionId;
    }

    private String buildFrontendUrl(String path) {
        String base = frontendBaseUrl == null ? "http://localhost:5173" : frontendBaseUrl.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + path;
    }

    private String seatCode(SeatStateDto seat) {
        return seat.getRowLabel().toUpperCase(Locale.ROOT) + seat.getColumnNumber();
    }

    private List<ChatMovieSuggestionDTO> movieSuggestionFromSession(BookingSession session,
            Map<Long, Movie> movieById) {
        if (session.getMovieId() == null) {
            return List.of();
        }
        Movie movie = movieById.get(session.getMovieId());
        return movie == null ? List.of() : List.of(toMovieSuggestion(movie, 100));
    }

    private List<ChatShowtimeSuggestionDTO> showtimeSuggestionFromSession(BookingSession session,
            Map<Long, Movie> movieById) {
        if (session.getShowtimeId() == null) {
            return List.of();
        }
        Showtime showtime = showtimeRepository.findById(session.getShowtimeId()).orElse(null);
        return showtime == null ? List.of()
                : List.of(toShowtimeSuggestion(showtime, movieById.get(showtime.getMovieId())));
    }

    private String formatMoney(Long amount) {
        if (amount == null) {
            return "0đ";
        }
        return String.format(Locale.forLanguageTag("vi-VN"), "%,dđ", amount);
    }

    private Map<Long, Integer> scoreMovies(String mergedConversation, List<Movie> movies,
            List<Showtime> upcomingShowtimes, UserPreference preference) {
        String normalizedConversation = normalize(mergedConversation);
        Set<Long> movieIdsWithUpcomingShowtimes = upcomingShowtimes.stream().map(Showtime::getMovieId)
                .collect(Collectors.toSet());
        Map<Long, Integer> scores = new HashMap<>();

        boolean asksForNowShowing = containsConfigured(normalizedConversation, "NOW_SHOWING");
        boolean asksForComingSoon = containsConfigured(normalizedConversation, "COMING_SOON");
        boolean asksForRecommendation = containsConfigured(normalizedConversation, "RECOMMENDATION");
        boolean asksForTime = containsConfigured(normalizedConversation, "TIME_QUERY");

        for (Movie movie : movies) {
            int score = 0;
            String title = normalize(movie.getTitle());
            String description = normalize(movie.getDescription());
            String ageRating = normalize(movie.getAgeRating());
            Set<String> genres = movie.getGenres().stream().map(Genre::getName).map(this::normalize)
                    .collect(Collectors.toSet());

            if (!title.isBlank() && normalizedConversation.contains(title)) {
                score += 12;
            }

            for (String token : extractTokens(normalizedConversation)) {
                if (token.length() < 3) {
                    continue;
                }
                if (title.contains(token))
                    score += 3;
                if (!description.isBlank() && description.contains(token))
                    score += 1;
                if (!ageRating.isBlank() && ageRating.contains(token))
                    score += 1;
                if (genres.stream().anyMatch(genre -> genre.contains(token) || token.contains(genre)))
                    score += 4;
            }

            if (movie.getStatus() == MovieStatus.NOW_SHOWING)
                score += 2;
            if (movie.getStatus() == MovieStatus.COMING_SOON)
                score += 1;
            if (movieIdsWithUpcomingShowtimes.contains(movie.getId()))
                score += 2;
            if (asksForNowShowing && movie.getStatus() == MovieStatus.NOW_SHOWING)
                score += 4;
            if (asksForComingSoon && movie.getStatus() == MovieStatus.COMING_SOON)
                score += 6;
            if (asksForRecommendation && movie.getStatus() == MovieStatus.NOW_SHOWING)
                score += 2;
            if (asksForTime && movieIdsWithUpcomingShowtimes.contains(movie.getId()))
                score += 4;

            if (preference.genreKeyword() != null && matchesGenrePreference(movie, preference)) {
                score += 30;
            } else if (preference.genreKeyword() != null) {
                score -= 50;
            }

            if (preference.specificMovieId() != null && preference.specificMovieId().equals(movie.getId())) {
                score += 100;
            } else if (preference.specificMovieId() != null) {
                score -= 40;
            }

            scores.put(movie.getId(), score);
        }
        return scores;
    }

    private String buildSystemInstruction() {
        return """
                Bạn là trợ lý chatbox của rạp phim AstraCine.
                Bạn PHẢI trả về JSON hợp lệ, không thêm markdown, không thêm giải thích ngoài JSON.
                Schema bắt buộc:
                {
                  "reply": "string",
                  "movieIds": [number],
                  "showtimeIds": [number]
                }

                Quy tắc:
                - Chỉ được chọn movieIds và showtimeIds có trong candidate backend cung cấp.
                - Không chọn phim đã ngừng chiếu.
                - Ưu tiên thật sát yêu cầu thể loại và thời gian nếu người dùng nêu rõ.
                - Nếu người dùng hỏi phim kinh dị thì không chọn phim khác thể loại.
                - Nếu người dùng hỏi đích danh một phim thì phải ưu tiên đúng phim đó.
                - Nếu không cần gợi ý phim hoặc suất chiếu thì trả mảng rỗng.
                - Nội dung reply phải nhất quán với các id đã chọn.
                - Không được bịa thêm phim, suất chiếu, phòng chiếu, giá vé hay ưu đãi.
                - Không nhắc tới tên phòng chiếu trong reply.
                - Trả lời ngắn gọn, tự nhiên, bằng tiếng Việt có dấu.
                """;
    }

    private String buildDatabaseContext(List<ChatMovieSuggestionDTO> candidateMovies,
            List<ChatShowtimeSuggestionDTO> candidateShowtimes,
            LocalDateTime now,
            UserPreference preference,
            LocalDate targetDate) {
        StringBuilder context = new StringBuilder();
        context.append("Thời điểm hệ thống: ").append(now.format(SHOWTIME_FORMATTER)).append("\n");
        context.append("Ràng buộc đã suy ra: movieId=")
                .append(preference.specificMovieId() == null ? "none" : preference.specificMovieId())
                .append(" | genre=").append(preference.genreKeyword() == null ? "none" : preference.genreKeyword())
                .append(" | date=").append(targetDate == null ? "none" : targetDate)
                .append(" | weekday=")
                .append(preference.preferredWeekday() == null ? "none" : preference.preferredWeekday())
                .append(" | targetTime=").append(preference.targetTime() == null ? "none" : preference.targetTime())
                .append(" | timeFrom=").append(preference.timeFrom() == null ? "none" : preference.timeFrom())
                .append(" | timeTo=").append(preference.timeTo() == null ? "none" : preference.timeTo())
                .append("\n");

        context.append("Candidate movies:\n");
        for (ChatMovieSuggestionDTO movie : candidateMovies) {
            context.append("- movieId=").append(movie.getId())
                    .append(" | title=").append(movie.getTitle())
                    .append(" | status=").append(movie.getStatus())
                    .append(" | genres=").append(String.join(", ", movie.getGenres()))
                    .append(" | duration=").append(movie.getDurationMinutes()).append(" phút")
                    .append(" | ageRating=").append(nullToUnknown(movie.getAgeRating()))
                    .append(" | description=").append(safeText(movie.getDescription(), 180))
                    .append("\n");
        }

        context.append("Candidate showtimes:\n");
        if (candidateShowtimes.isEmpty()) {
            context.append("- none\n");
        } else {
            for (ChatShowtimeSuggestionDTO showtime : candidateShowtimes) {
                context.append("- showtimeId=").append(showtime.getId())
                        .append(" | movieId=").append(showtime.getMovieId())
                        .append(" | movieTitle=").append(showtime.getMovieTitle())
                        .append(" | start=").append(showtime.getStartTime().format(SHOWTIME_FORMATTER))
                        .append(" | end=").append(showtime.getEndTime().format(SHOWTIME_FORMATTER))
                        .append("\n");
            }
        }
        return context.toString();
    }

    private List<String> buildPrompts(ChatRequest request, String dbContext) {
        List<String> prompts = new ArrayList<>();
        prompts.add("Dữ liệu ứng viên từ backend:\n" + dbContext);
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
        prompts.add(
                "Hãy chọn các id phù hợp nhất từ danh sách candidate và trả về JSON theo đúng schema. Câu hỏi hiện tại:\n"
                        + request.getMessage().trim());
        return prompts;
    }

    private String formatHistoryMessage(ChatMessageDTO message) {
        String role = message.getRole() == null ? "user" : message.getRole().trim();
        return role + ": " + message.getContent().trim();
    }

    private GeminiDecision parseGeminiDecision(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return null;
        }

        String normalized = rawText.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```(?:json)?", "").replaceFirst("```$", "").trim();
        }

        int start = normalized.indexOf('{');
        int end = normalized.lastIndexOf('}');
        if (start >= 0 && end > start) {
            normalized = normalized.substring(start, end + 1);
        }

        try {
            return objectMapper.readValue(normalized, GeminiDecision.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<ChatMovieSuggestionDTO> selectMovies(List<Long> movieIds,
            Map<Long, ChatMovieSuggestionDTO> candidateMovieMap) {
        if (movieIds == null || movieIds.isEmpty())
            return List.of();
        return new LinkedHashSet<>(movieIds).stream().map(candidateMovieMap::get).filter(Objects::nonNull)
                .limit(MAX_FINAL_SUGGESTIONS).toList();
    }

    private List<ChatShowtimeSuggestionDTO> selectShowtimes(List<Long> showtimeIds,
            Map<Long, ChatShowtimeSuggestionDTO> candidateShowtimeMap) {
        if (showtimeIds == null || showtimeIds.isEmpty())
            return List.of();
        return new LinkedHashSet<>(showtimeIds).stream().map(candidateShowtimeMap::get).filter(Objects::nonNull)
                .limit(MAX_FINAL_SUGGESTIONS).toList();
    }

    private ChatMovieSuggestionDTO toMovieSuggestion(Movie movie, Integer relevanceScore) {
        return new ChatMovieSuggestionDTO(
                movie.getId(), movie.getTitle(), movie.getDescription(), movie.getDurationMinutes(),
                movie.getAgeRating(),
                movie.getStatus() == null ? "UNKNOWN" : movie.getStatus().name(), movie.getReleaseDate(),
                movie.getEndDate(),
                movie.getGenres().stream().map(Genre::getName).sorted().toList(), movie.getPosterUrl(), relevanceScore);
    }

    private ChatShowtimeSuggestionDTO toShowtimeSuggestion(Showtime showtime, Movie movie) {
        return new ChatShowtimeSuggestionDTO(
                showtime.getId(), showtime.getMovieId(), movie == null ? "Phim không xác định" : movie.getTitle(),
                showtime.getRoom().getId(), showtime.getRoom().getName(), showtime.getStartTime(),
                showtime.getEndTime(),
                showtime.getStatus() == null ? "UNKNOWN" : showtime.getStatus().name());
    }

    private String buildFallbackReply(String userMessage, List<ChatMovieSuggestionDTO> suggestedMovies,
            List<ChatShowtimeSuggestionDTO> suggestedShowtimes, String aiErrorMessage) {
        StringBuilder reply = new StringBuilder();
        reply.append("Mình đã kiểm tra dữ liệu phim và suất chiếu hiện có của rạp");
        if (aiErrorMessage != null && !aiErrorMessage.isBlank())
            reply.append(", nhưng hiện chưa gọi được Gemini");
        reply.append(". ");

        if (!suggestedMovies.isEmpty()) {
            reply.append("Bạn có thể tham khảo ");
            reply.append(
                    suggestedMovies.stream().map(ChatMovieSuggestionDTO::getTitle).collect(Collectors.joining(", ")));
            reply.append(". ");
        } else {
            reply.append("Hiện mình chưa tìm thấy phim phù hợp trực tiếp với yêu cầu \"").append(userMessage.trim())
                    .append("\". ");
        }

        if (!suggestedShowtimes.isEmpty()) {
            reply.append("Một vài suất chiếu gần nhất là ");
            reply.append(suggestedShowtimes.stream()
                    .map(showtime -> showtime.getMovieTitle() + " lúc "
                            + showtime.getStartTime().format(SHOWTIME_FORMATTER))
                    .collect(Collectors.joining("; ")));
            reply.append(". ");
        } else {
            reply.append("Hiện chưa có suất chiếu sắp tới phù hợp trong dữ liệu. ");
        }

        reply.append("Các gợi ý đính kèm bên dưới chính là dữ liệu mà câu trả lời đang tham chiếu.");
        return reply.toString();
    }

    private String buildMovieOnlyReply(String userMessage, List<ChatMovieSuggestionDTO> suggestedMovies,
            UserPreference preference) {
        LocalDate targetDate = preference.preferredDate() == null ? LocalDate.now() : preference.preferredDate();
        String dayLabel = targetDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        if (suggestedMovies.isEmpty()) {
            return "Hiện mình chưa thấy phim nào có lịch chiếu vào ngày " + dayLabel + ".";
        }

        String prefix = normalize(userMessage).contains("ngay mai")
                ? "Ngày mai, " + dayLabel + ", AstraCine có chiếu các phim sau:\n"
                : "AstraCine hiện có các phim sau:\n";

        return prefix + suggestedMovies.stream()
                .map(movie -> "- " + movie.getTitle())
                .collect(Collectors.joining("\n"));
    }

    private boolean isMovieListOnlyQuery(String currentMessage, UserPreference preference) {
        String normalized = normalize(currentMessage);
        if (preference.specificMovieId() != null) {
            return false;
        }
        return containsAny(normalized, List.of(
                "phim nao chieu",
                "co phim nao chieu",
                "nhung phim nao chieu",
                "co nhung phim nao",
                "lich chieu phim nao",
                "ngay mai co phim nao chieu"));
    }

    private String buildOutOfDomainReply(String currentMessage) {
        String normalized = normalize(currentMessage);
        if (containsAny(normalized, List.of("xin chao", "chao", "hello", "hi", "helo"))) {
            return "Chào bạn! Mình có thể hỗ trợ tư vấn phim, lịch chiếu và đặt vé. Bạn có thể nhắn như `phim nào đang chiếu`, `hôm nay có suất nào` hoặc `đặt vé Avatar 3`.";
        }
        if (containsAny(normalized, List.of(
                "toi buon", "hom nay toi buon", "chan qua", "met qua", "co don", "tam trang", "stress", "buon qua"))) {
            return "Mình hiểu rồi. Nếu bạn muốn đổi mood một chút, mình có thể gợi ý phim phù hợp, lịch chiếu hôm nay hoặc hỗ trợ đặt vé ngay trong khung chat này.";
        }
        if (containsAny(normalized, List.of("cam on", "thank", "thanks", "thank you"))) {
            return "Mình luôn sẵn sàng hỗ trợ. Khi cần xem phim, lịch chiếu hoặc đặt vé, bạn cứ nhắn mình nhé.";
        }
        if (containsAny(normalized, List.of("tam biet", "bye", "bai bai", "hen gap lai"))) {
            return "Mình luôn ở đây nếu bạn muốn xem lịch chiếu, chọn phim hoặc đặt vé. Hẹn gặp lại bạn nhé.";
        }
        return "Mình có thể hỗ trợ tư vấn phim, lịch chiếu và đặt vé. Nếu bạn muốn, bạn có thể nhắn như `hôm nay có phim gì hay`, `phim nào đang chiếu` hoặc `đặt vé Avatar 3`.";
    }

    private boolean isSmallTalkOrOffTopic(String currentMessage, List<Movie> movies) {
        String normalized = normalize(currentMessage);
        if (normalized.isBlank()) {
            return true;
        }
        if (containsAny(normalized, List.of(
                "phim", "ve", "suat", "chieu", "lich", "rap", "ghe", "combo",
                "dat ve", "mua ve", "thanh toan", "goi y", "nen xem", "coming soon"))) {
            return false;
        }
        if (extractSpecificMovieId(normalized, movies) != null || resolveGenreKeyword(normalized) != null) {
            return false;
        }
        return containsAny(normalized, List.of(
                "toi buon",
                "hom nay toi buon",
                "chan qua",
                "met qua",
                "co don",
                "tam trang",
                "buon qua",
                "stress",
                "xin chao",
                "chao",
                "hello",
                "hi",
                "helo",
                "cam on",
                "thanks",
                "thank you",
                "tam biet",
                "bye",
                "hen gap lai",
                "bai bai"));
    }

    private boolean hasExactShowtimeMatch(List<Showtime> showtimes, LocalTime targetTime) {
        if (targetTime == null) {
            return false;
        }
        return showtimes.stream()
                .map(Showtime::getStartTime)
                .filter(Objects::nonNull)
                .map(LocalDateTime::toLocalTime)
                .anyMatch(startTime -> startTime.equals(targetTime));
    }

    private UserPreference extractUserPreference(String mergedConversation, LocalDateTime now, List<Movie> movies) {
        String normalized = normalize(mergedConversation);

        String genreKeyword = resolveGenreKeyword(normalized);

        LocalDate preferredDate = null;
        if (containsConfigured(normalized, "TOMORROW"))
            preferredDate = now.toLocalDate().plusDays(1);
        else if (containsConfigured(normalized, "TODAY"))
            preferredDate = now.toLocalDate();

        DayOfWeek preferredWeekday = extractPreferredWeekday(normalized);
        LocalTime targetTime = extractTargetTime(normalized);

        LocalTime timeFrom = null;
        LocalTime timeTo = null;
        if (containsConfigured(normalized, "TIME_SLOT_EVENING")) {
            timeFrom = LocalTime.of(18, 0);
            timeTo = LocalTime.of(23, 59);
        } else if (containsConfigured(normalized, "TIME_SLOT_AFTERNOON")) {
            timeFrom = LocalTime.of(13, 30);
            timeTo = LocalTime.of(18, 0);
        } else if (containsConfigured(normalized, "TIME_SLOT_MORNING")) {
            timeFrom = LocalTime.of(6, 0);
            timeTo = LocalTime.of(11, 30);
        } else if (containsConfigured(normalized, "TIME_SLOT_NOON")) {
            timeFrom = LocalTime.of(11, 30);
            timeTo = LocalTime.of(13, 30);
        }
        if (targetTime != null) {
            timeFrom = null;
            timeTo = null;
        }

        Long specificMovieId = extractSpecificMovieId(normalized, movies);
        return new UserPreference(genreKeyword, preferredDate, preferredWeekday, targetTime, timeFrom, timeTo,
                specificMovieId);
    }

    private Long extractSpecificMovieId(String normalizedConversation, List<Movie> movies) {
        long bestMovieId = -1L;
        int bestScore = 0;
        Set<String> conversationTokens = extractTokens(normalizedConversation);

        for (Movie movie : movies) {
            String normalizedTitle = normalize(movie.getTitle());
            int score = 0;
            boolean explicitTitle = !normalizedTitle.isBlank()
                    && normalizedConversation.contains(normalizedTitle)
                    && !GENERIC_MOVIE_TOKENS.contains(normalizedTitle);
            if (explicitTitle)
                score += 100;

            if (!normalizedTitle.isBlank()
                    && (normalizedTitle.contains(normalizedConversation)
                            || normalizedConversation.contains(normalizedTitle))) {
                score += 30;
            }

            List<String> titleTokens = extractTokens(normalizedTitle).stream()
                    .filter(token -> token.length() >= 3)
                    .filter(token -> !GENERIC_MOVIE_TOKENS.contains(token))
                    .collect(Collectors.toList());

            if (!titleTokens.isEmpty()) {
                String primaryToken = titleTokens.get(0);
                if (conversationTokens.contains(primaryToken)) {
                    score += 25;
                }
            }

            for (String token : titleTokens) {
                if (token.length() >= 3 && conversationTokens.contains(token))
                    score += 10;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMovieId = movie.getId();
            }
        }
        return bestScore >= 15 ? bestMovieId : null;
    }

    private DayOfWeek extractPreferredWeekday(String normalizedConversation) {
        Map<String, DayOfWeek> mappings = new LinkedHashMap<>();
        mappings.put("thu hai", DayOfWeek.MONDAY);
        mappings.put("thu 2", DayOfWeek.MONDAY);
        mappings.put("t2", DayOfWeek.MONDAY);
        mappings.put("thu ba", DayOfWeek.TUESDAY);
        mappings.put("thu 3", DayOfWeek.TUESDAY);
        mappings.put("t3", DayOfWeek.TUESDAY);
        mappings.put("thu tu", DayOfWeek.WEDNESDAY);
        mappings.put("thu 4", DayOfWeek.WEDNESDAY);
        mappings.put("t4", DayOfWeek.WEDNESDAY);
        mappings.put("thu nam", DayOfWeek.THURSDAY);
        mappings.put("thu 5", DayOfWeek.THURSDAY);
        mappings.put("t5", DayOfWeek.THURSDAY);
        mappings.put("thu sau", DayOfWeek.FRIDAY);
        mappings.put("thu 6", DayOfWeek.FRIDAY);
        mappings.put("t6", DayOfWeek.FRIDAY);
        mappings.put("thu bay", DayOfWeek.SATURDAY);
        mappings.put("thu 7", DayOfWeek.SATURDAY);
        mappings.put("t7", DayOfWeek.SATURDAY);
        mappings.put("chu nhat", DayOfWeek.SUNDAY);
        mappings.put("cn", DayOfWeek.SUNDAY);
        for (Map.Entry<String, DayOfWeek> entry : mappings.entrySet()) {
            if (normalizedConversation.contains(entry.getKey()))
                return entry.getValue();
        }
        return null;
    }

    private LocalTime extractTargetTime(String normalizedConversation) {
        Matcher explicitMatcher = EXPLICIT_TIME_PATTERN.matcher(normalizedConversation);
        LocalTime explicitTime = null;
        while (explicitMatcher.find()) {
            int hour = Integer.parseInt(explicitMatcher.group(1));
            int minute = Integer.parseInt(explicitMatcher.group(2));
            if (minute >= 0 && minute <= 59) {
                explicitTime = LocalTime.of(hour, minute);
            }
        }
        if (explicitTime != null) {
            return explicitTime;
        }

        Matcher hourOnlyMatcher = HOUR_ONLY_PATTERN.matcher(normalizedConversation);
        LocalTime hourOnlyTime = null;
        while (hourOnlyMatcher.find()) {
            int hour = Integer.parseInt(hourOnlyMatcher.group(1));
            hourOnlyTime = LocalTime.of(hour, 0);
        }
        return hourOnlyTime;
    }

    private boolean matchesGenrePreference(Movie movie, UserPreference preference) {
        if (preference.genreKeyword() == null || preference.genreKeyword().isBlank())
            return true;
        return movie.getGenres().stream()
                .map(Genre::getName)
                .map(this::normalize)
                .anyMatch(genre -> genre.contains(preference.genreKeyword())
                        || preference.genreKeyword().contains(genre));
    }

    private LocalDate resolveTargetDate(UserPreference preference, List<Showtime> showtimes) {
        if (preference.preferredDate() != null)
            return preference.preferredDate();
        if (preference.preferredWeekday() == null)
            return null;
        return showtimes.stream()
                .map(showtime -> showtime.getStartTime().toLocalDate())
                .filter(date -> date.getDayOfWeek() == preference.preferredWeekday())
                .min(LocalDate::compareTo)
                .orElse(null);
    }

    private boolean matchesTimePreference(Showtime showtime, UserPreference preference, LocalDate targetDate) {
        if (targetDate != null && !showtime.getStartTime().toLocalDate().equals(targetDate))
            return false;
        if (preference.timeFrom() != null && preference.timeTo() != null) {
            LocalTime start = showtime.getStartTime().toLocalTime();
            if (start.isBefore(preference.timeFrom()) || start.isAfter(preference.timeTo()))
                return false;
        }
        return true;
    }

    private List<Showtime> prioritizeShowtimesAroundTargetTime(List<Showtime> showtimes, LocalTime targetTime) {
        List<Showtime> sorted = showtimes.stream().sorted(Comparator.comparing(Showtime::getStartTime)).toList();
        List<Showtime> exact = sorted.stream()
                .filter(showtime -> showtime.getStartTime().toLocalTime().equals(targetTime)).toList();
        if (!exact.isEmpty())
            return exact;

        List<Showtime> before = sorted.stream()
                .filter(showtime -> showtime.getStartTime().toLocalTime().isBefore(targetTime)).toList();
        List<Showtime> after = sorted.stream()
                .filter(showtime -> !showtime.getStartTime().toLocalTime().isBefore(targetTime)).toList();
        List<Showtime> prioritized = new ArrayList<>();
        if (!before.isEmpty())
            prioritized.add(before.get(before.size() - 1));
        prioritized.addAll(after.stream().limit(2).toList());

        Set<Long> selectedIds = prioritized.stream().map(Showtime::getId).collect(Collectors.toSet());
        sorted.stream().filter(showtime -> !selectedIds.contains(showtime.getId())).forEach(prioritized::add);
        return prioritized;
    }

    private boolean containsConfigured(String text, String keywordGroup) {
        return containsAny(text, INTENT_KEYWORDS.getOrDefault(keywordGroup, List.of()));
    }

    private String resolveGenreKeyword(String normalizedText) {
        return GENRE_KEYWORDS.entrySet().stream()
                .filter(entry -> containsAny(normalizedText, entry.getValue()))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }

    private String safeText(String value, int maxLength) {
        if (value == null || value.isBlank())
            return "Không có mô tả";
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength - 3) + "...";
    }

    private String nullToUnknown(Object value) {
        return value == null ? "Không rõ" : String.valueOf(value);
    }

    private boolean containsAny(String text, List<String> keywords) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String paddedText = " " + text + " ";
        for (String keyword : keywords) {
            String paddedKeyword = " " + keyword + " ";
            if (paddedText.contains(paddedKeyword))
                return true;
        }
        return false;
    }

    private Set<String> extractTokens(String text) {
        if (text == null || text.isBlank())
            return Set.of();
        String cleaned = text.replaceAll("[^\\p{L}\\p{Nd}\\s]", " ");
        return List.of(cleaned.split("\\s+")).stream()
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .collect(Collectors.toCollection(HashSet::new));
    }

    private String normalize(String input) {
        if (input == null || input.isBlank())
            return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        normalized = normalized.replace("\u0111", "d").replace("\u0110", "d");
        return normalized.replaceAll("\\s+", " ").trim();
    }

    private record GeminiDecision(String reply, List<Long> movieIds, List<Long> showtimeIds) {
    }

    private record UserPreference(String genreKeyword, LocalDate preferredDate, DayOfWeek preferredWeekday,
            LocalTime targetTime, LocalTime timeFrom, LocalTime timeTo, Long specificMovieId) {
    }

    @Data
    private static class BookingSession {
        private String sessionId;
        private boolean active;
        private Long movieId;
        private Long showtimeId;
        private List<Long> seatIds = new ArrayList<>();
        private List<ComboCartItemDTO> comboItems = new ArrayList<>();
        private boolean comboResolved;
        private boolean awaitingConfirmation;
        private boolean awaitingPayment;
        private String holdId;
        private Long orderCode;
    }
}
