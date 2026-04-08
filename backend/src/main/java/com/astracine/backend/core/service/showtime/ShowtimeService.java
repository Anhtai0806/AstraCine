package com.astracine.backend.core.service.showtime;

import com.astracine.backend.core.entity.Movie;
import com.astracine.backend.core.entity.Room;
import com.astracine.backend.core.entity.Seat;
import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.entity.ShowtimeSeat;
import com.astracine.backend.core.entity.TimeSlot;
import com.astracine.backend.core.enums.MovieStatus;
import com.astracine.backend.core.enums.RoomStatus;
import com.astracine.backend.core.enums.SeatBookingStatus;
import com.astracine.backend.core.enums.SeatStatus;
import com.astracine.backend.core.enums.ShowtimeStatus;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.RoomRepository;
import com.astracine.backend.core.repository.SeatRepository;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.core.repository.ShowtimeSeatRepository;
import com.astracine.backend.core.repository.TimeSlotRepository;
import com.astracine.backend.presentation.dto.ShowtimeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ShowtimeService {

    private static final int CLEANUP_MINUTES = 15;
    private static final int ROOM_STAGGER_MINUTES = 15;
    private static final LocalTime DEFAULT_OPENING_TIME = LocalTime.of(7, 0);
    private static final LocalTime DEFAULT_CLOSING_TIME = LocalTime.of(2, 0);

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final SeatRepository seatRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final RoomRepository roomRepository;
    private final MovieRepository movieRepository;
    private final ShowtimeSchedulingScoreService showtimeSchedulingScoreService;

    public ShowtimeDTO.ManualCreateResponse createShowtime(ShowtimeDTO.CreateRequest request) {
        Room room = getActiveRoom(request.getRoomId());
        Movie movie = getSchedulableMovie(request.getMovieId(), request.getStartTime().toLocalDate());
        validateRoomAvailability(room.getId(), request.getStartTime(),
                request.getStartTime().plusMinutes(movie.getDurationMinutes()), null);
        Showtime saved = saveShowtime(movie, room, request.getStartTime());
        String warning = checkConsecutiveMovieWarning(room.getId(), movie.getId(), request.getStartTime(), null);
        return new ShowtimeDTO.ManualCreateResponse(mapToResponse(saved), warning);
    }

    public ShowtimeDTO.ManualCreateResponse updateShowtime(Long showtimeId, ShowtimeDTO.CreateRequest request) {
        Showtime existing = getShowtime(showtimeId);
        ensureShowtimeEditable(existing);

        Room room = getActiveRoom(request.getRoomId());
        Movie movie = getSchedulableMovie(request.getMovieId(), request.getStartTime().toLocalDate());
        validateRoomAvailability(room.getId(), request.getStartTime(),
                request.getStartTime().plusMinutes(movie.getDurationMinutes()), showtimeId);

        deleteShowtimeSeats(existing.getId());

        TimeSlot timeSlot = resolveTimeSlot(request.getStartTime());
        LocalDateTime endTime = request.getStartTime().plusMinutes(movie.getDurationMinutes());

        existing.setMovieId(movie.getId());
        existing.setRoom(room);
        existing.setTimeSlotId(timeSlot.getId());
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(endTime);
        existing.setStatus(ShowtimeStatus.OPEN);

        Showtime saved = showtimeRepository.save(existing);
        initializeShowtimeSeats(saved, room.getId(), timeSlot.getPriceMultiplier(), room.getPriceMultiplier());

        String warning = checkConsecutiveMovieWarning(room.getId(), movie.getId(), request.getStartTime(), showtimeId);
        return new ShowtimeDTO.ManualCreateResponse(mapToResponse(saved), warning);
    }

    public void deleteShowtime(Long showtimeId) {
        Showtime showtime = getShowtime(showtimeId);
        ensureShowtimeEditable(showtime);
        deleteShowtimeSeats(showtimeId);
        showtimeRepository.delete(showtime);
    }

    public void deleteShowtimesByDate(LocalDate scheduleDate) {
        LocalDateTime dayStart = scheduleDate.atStartOfDay();
        LocalDateTime dayEnd = scheduleDate.plusDays(1).atStartOfDay();

        List<Showtime> showtimesToDelete = showtimeRepository.findAll().stream()
                .filter(showtime -> showtime.getStatus() != ShowtimeStatus.CANCELLED)
                .filter(showtime -> !showtime.getStartTime().isBefore(dayStart))
                .filter(showtime -> showtime.getStartTime().isBefore(dayEnd))
                .sorted(Comparator.comparing(Showtime::getStartTime))
                .collect(Collectors.toList());

        for (Showtime showtime : showtimesToDelete) {
            ensureShowtimeEditable(showtime);
        }

        for (Showtime showtime : showtimesToDelete) {
            deleteShowtimeSeats(showtime.getId());
        }

        if (!showtimesToDelete.isEmpty()) {
            showtimeRepository.deleteAll(showtimesToDelete);
        }
    }

    public ShowtimeDTO.GenerateResponse generateShowtimes(ShowtimeDTO.GenerateRequest request) {
        return generateShowtimesInternal(request, true);
    }

    public ShowtimeDTO.GenerateResponse previewGenerateShowtimes(ShowtimeDTO.GenerateRequest request) {
        return generateShowtimesInternal(request, false);
    }

    public ShowtimeDTO.GenerateResponse confirmGeneratedShowtimes(ShowtimeDTO.ConfirmGenerateRequest request) {
        List<ShowtimeDTO.ConfirmShowtimeItem> previewItems = request.getShowtimes() == null
                ? List.of()
                : request.getShowtimes().stream()
                        .filter(Objects::nonNull)
                        .sorted(Comparator.comparing(ShowtimeDTO.ConfirmShowtimeItem::getStartTime)
                                .thenComparing(ShowtimeDTO.ConfirmShowtimeItem::getRoomId))
                        .collect(Collectors.toList());

        if (previewItems.isEmpty()) {
            throw new RuntimeException("Không có suất chiếu xem trước để lưu");
        }

        List<ShowtimeDTO.Response> createdShowtimes = new ArrayList<>();

        for (ShowtimeDTO.ConfirmShowtimeItem item : previewItems) {
            Movie movie = getSchedulableMovie(item.getMovieId(), item.getStartTime().toLocalDate());
            Room room = getActiveRoom(item.getRoomId());

            validateRoomAvailability(
                    room.getId(),
                    item.getStartTime(),
                    item.getStartTime().plusMinutes(movie.getDurationMinutes()),
                    null);

            Showtime saved = saveShowtime(movie, room, item.getStartTime());
            createdShowtimes.add(mapToResponse(saved));
        }

        return new ShowtimeDTO.GenerateResponse(
                request.getScheduleDate(),
                CLEANUP_MINUTES,
                createdShowtimes.size(),
                false,
                "Đã lưu lịch chiếu từ bản xem trước",
                createdShowtimes);
    }

    private ShowtimeDTO.GenerateResponse generateShowtimesInternal(ShowtimeDTO.GenerateRequest request,
            boolean persist) {
        LocalDate scheduleDate = request.getScheduleDate();
        LocalTime openingTime = request.getOpeningTime() == null ? DEFAULT_OPENING_TIME : request.getOpeningTime();
        LocalTime closingTime = request.getClosingTime() == null ? DEFAULT_CLOSING_TIME : request.getClosingTime();
        LocalDateTime windowEnd = resolveWindowEnd(
                scheduleDate,
                openingTime,
                closingTime);
        LocalDateTime windowStart = resolveFutureWindowStart(scheduleDate, openingTime, windowEnd);

        List<Movie> movies = resolveMoviesForGeneration(request.getMovieIds(), scheduleDate);
        if (movies.isEmpty()) {
            throw new RuntimeException("Không có phim hợp lệ để tạo lịch trong ngày đã chọn");
        }

        List<Room> rooms = resolveRoomsForGeneration(request.getRoomIds());
        if (rooms.isEmpty()) {
            throw new RuntimeException("Không có phòng hợp lệ để tạo lịch");
        }

        Map<Long, Integer> movieCounts = new HashMap<>();
        Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage = new HashMap<>();
        List<RoomGenerationState> roomStates = new ArrayList<>();

        movies.forEach(movie -> movieCounts.put(movie.getId(), 0));

        for (int roomIndex = 0; roomIndex < rooms.size(); roomIndex++) {
            Room room = rooms.get(roomIndex);
            List<Showtime> existingShowtimes = showtimeRepository.findByRoom_IdAndStatusNotOrderByStartTimeAsc(
                    room.getId(), ShowtimeStatus.CANCELLED);

            existingShowtimes.stream()
                    .filter(showtime -> overlapsWindow(showtime, windowStart, windowEnd))
                    .forEach(showtime -> {
                        movieCounts.merge(showtime.getMovieId(), 1, Integer::sum);
                        recordSlotUsage(slotMovieUsage, showtime.getStartTime(), showtime.getMovieId());
                    });

            roomStates.add(buildRoomState(room, roomIndex, existingShowtimes, windowStart));
        }

        List<ShowtimeDTO.Response> createdShowtimes = new ArrayList<>();
        boolean progress;

        do {
            progress = false;

            for (RoomGenerationState state : roomStates) {
                advancePastAnchors(state, windowEnd);
                if (state.cursor == null || !state.cursor.isBefore(windowEnd)) {
                    continue;
                }

                Showtime nextAnchor = state.peekNextAnchor();
                LocalDateTime gapEnd = nextAnchor == null
                        ? windowEnd
                        : nextAnchor.getStartTime().minusMinutes(CLEANUP_MINUTES);

                if (!state.cursor.isBefore(gapEnd)) {
                    moveToAfterAnchor(state, nextAnchor, windowEnd);
                    continue;
                }

                Movie selectedMovie = chooseBestMovieForSlot(
                        state,
                        gapEnd,
                        windowEnd,
                        movies,
                        movieCounts,
                        slotMovieUsage,
                        nextAnchor == null ? null : nextAnchor.getMovieId());

                if (selectedMovie == null) {
                    moveToAfterAnchor(state, nextAnchor, windowEnd);
                    continue;
                }

                ShowtimeDTO.Response generatedShowtime = persist
                        ? mapToResponse(saveShowtime(selectedMovie, state.room, state.cursor))
                        : buildPreviewResponse(selectedMovie, state.room, state.cursor);
                createdShowtimes.add(generatedShowtime);
                movieCounts.merge(selectedMovie.getId(), 1, Integer::sum);
                recordSlotUsage(slotMovieUsage, generatedShowtime.getStartTime(), selectedMovie.getId());

                state.previousMovieId = selectedMovie.getId();
                state.cursor = roundUpToFiveMinuteMark(
                        generatedShowtime.getEndTime().plusMinutes(CLEANUP_MINUTES));
                progress = true;
            }
        } while (progress);

        return new ShowtimeDTO.GenerateResponse(
                scheduleDate,
                CLEANUP_MINUTES,
                createdShowtimes.size(),
                !persist,
                createdShowtimes.isEmpty()
                        ? "Không tìm thấy khoảng trống phù hợp để tạo thêm suất chiếu"
                        : persist
                                ? "Đã tạo lịch tự động thành công"
                                : "Đã tạo xem trước lịch chiếu. Kiểm tra timeline trước khi lưu.",
                createdShowtimes);
    }

    @Transactional(readOnly = true)
    public ShowtimeDTO.SeatMapResponse getSeatMap(Long showtimeId) {
        Showtime showtime = getShowtime(showtimeId);
        TimeSlot timeSlot = timeSlotRepository.findById(showtime.getTimeSlotId())
                .orElseThrow(() -> new RuntimeException("Dữ liệu khung giờ không hợp lệ"));

        List<ShowtimeSeat> showtimeSeats = showtimeSeatRepository.findByShowtimeIdOrderBySeatIdAsc(showtimeId);
        Long roomId = showtime.getRoom().getId();

        Map<Long, Seat> seatMap = seatRepository.findByRoomIdOrderByRowLabelAscColumnNumberAsc(roomId)
                .stream()
                .collect(Collectors.toMap(Seat::getId, seat -> seat));

        Map<String, List<ShowtimeDTO.SeatInfo>> groupedSeats = new LinkedHashMap<>();

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {
            Seat seat = seatMap.get(showtimeSeat.getSeat().getId());
            if (seat == null) {
                continue;
            }

            ShowtimeDTO.SeatInfo seatInfo = new ShowtimeDTO.SeatInfo(
                    showtimeSeat.getId(),
                    seat.getRowLabel(),
                    seat.getColumnNumber(),
                    seat.getSeatType(),
                    seat.getBasePrice(),
                    showtimeSeat.getFinalPrice(),
                    showtimeSeat.getStatus());

            groupedSeats.computeIfAbsent(seat.getRowLabel(), ignored -> new ArrayList<>()).add(seatInfo);
        }

        List<ShowtimeDTO.SeatRow> seatRows = groupedSeats.entrySet().stream()
                .map(entry -> new ShowtimeDTO.SeatRow(
                        entry.getKey(),
                        entry.getValue().stream()
                                .sorted(Comparator.comparing(ShowtimeDTO.SeatInfo::getColumnNumber))
                                .collect(Collectors.toList())))
                .collect(Collectors.toList());

        return new ShowtimeDTO.SeatMapResponse(
                showtime.getId(),
                getMovieTitle(showtime.getMovieId()),
                showtime.getStartTime(),
                timeSlot.getName(),
                timeSlot.getPriceMultiplier(),
                seatRows);
    }

    @Transactional(readOnly = true)
    public List<ShowtimeDTO.Response> getAllShowtimes() {
        return showtimeRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private RoomGenerationState buildRoomState(Room room,
            int roomIndex,
            List<Showtime> existingShowtimes,
            LocalDateTime windowStart) {
        List<Showtime> anchors = existingShowtimes.stream()
                .filter(showtime -> showtime.getStartTime().isAfter(windowStart)
                        || showtime.getEndTime().isAfter(windowStart))
                .collect(Collectors.toList());

        Showtime previousShowtime = findPreviousShowtime(existingShowtimes, windowStart);
        LocalDateTime staggeredStart = roundUpToFiveMinuteMark(
                windowStart.plusMinutes((long) roomIndex * ROOM_STAGGER_MINUTES));
        LocalDateTime initialCursor = previousShowtime == null
                ? staggeredStart
                : max(staggeredStart,
                        roundUpToFiveMinuteMark(previousShowtime.getEndTime().plusMinutes(CLEANUP_MINUTES)));

        return new RoomGenerationState(
                room,
                roomIndex,
                anchors,
                0,
                initialCursor,
                previousShowtime == null ? null : previousShowtime.getMovieId());
    }

    private void advancePastAnchors(RoomGenerationState state, LocalDateTime windowEnd) {
        while (true) {
            Showtime nextAnchor = state.peekNextAnchor();
            if (nextAnchor == null) {
                return;
            }

            LocalDateTime anchorGapStart = nextAnchor.getStartTime().minusMinutes(CLEANUP_MINUTES);
            if (state.cursor.isBefore(anchorGapStart)) {
                return;
            }

            state.cursor = max(
                    state.cursor,
                    roundUpToFiveMinuteMark(nextAnchor.getEndTime().plusMinutes(CLEANUP_MINUTES)));
            state.previousMovieId = nextAnchor.getMovieId();
            state.nextAnchorIndex++;

            if (!state.cursor.isBefore(windowEnd)) {
                return;
            }
        }
    }

    private void moveToAfterAnchor(RoomGenerationState state, Showtime nextAnchor, LocalDateTime windowEnd) {
        if (nextAnchor == null) {
            state.cursor = windowEnd;
            return;
        }

        state.cursor = max(
                state.cursor,
                roundUpToFiveMinuteMark(nextAnchor.getEndTime().plusMinutes(CLEANUP_MINUTES)));
        state.previousMovieId = nextAnchor.getMovieId();
        state.nextAnchorIndex++;
    }

    /**
     * Chọn phim bằng thuật toán chấm điểm mềm (soft rule).
     *
     * <p>
     * Luật chiếu liên tiếp không còn là hard filter, mà được trừ điểm tùy theo
     * priority để vẫn ưu tiên phim hot nhưng tránh lặp quá cứng giữa các suất.
     */
    private Movie chooseBestMovieForSlot(RoomGenerationState state,
            LocalDateTime gapEnd,
            LocalDateTime windowEnd,
            List<Movie> movies,
            Map<Long, Integer> movieCounts,
            Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage,
            Long nextAnchorMovieId) {
        List<Movie> fittingMovies = movies.stream()
                .filter(movie -> endsWithinAllowedWindow(state.cursor, movie, gapEnd, windowEnd))
                .filter(movie -> !Objects.equals(movie.getId(), nextAnchorMovieId))
                .collect(Collectors.toList());

        if (fittingMovies.isEmpty()) {
            return null;
        }

        return showtimeSchedulingScoreService.pickBestMovie(
                fittingMovies,
                movieCounts,
                slotMovieUsage,
                state.cursor,
                state.previousMovieId,
                state.room.getId());
    }

    private boolean endsWithinAllowedWindow(LocalDateTime startTime,
            Movie movie,
            LocalDateTime gapEnd,
            LocalDateTime windowEnd) {
        LocalDateTime movieEnd = startTime.plusMinutes(movie.getDurationMinutes());
        return !movieEnd.isAfter(gapEnd) && !movieEnd.isAfter(windowEnd);
    }

    private void recordSlotUsage(Map<LocalDateTime, Map<Long, Integer>> slotMovieUsage,
            LocalDateTime startTime,
            Long movieId) {
        slotMovieUsage
                .computeIfAbsent(startTime, ignored -> new HashMap<>())
                .merge(movieId, 1, Integer::sum);
    }

    private Showtime saveShowtime(Movie movie, Room room, LocalDateTime startTime) {
        TimeSlot timeSlot = resolveTimeSlot(startTime);
        LocalDateTime endTime = startTime.plusMinutes(movie.getDurationMinutes());

        // [GUARD] Chặn tạo suất chiếu cho phòng đang INACTIVE
        if (room.getStatus() != com.astracine.backend.core.enums.RoomStatus.ACTIVE) {
            throw new RuntimeException("Phòng chiếu đang ngưng hoạt động, không thể tạo suất chiếu mới.");
        }

        // 5. Lưu Showtime
        // Constructor này nhận tham số hỗn hợp: (Long movieId, Room room, Long
        // timeSlotId, ...)
        Showtime showtime = new Showtime(
                movie.getId(),
                room,
                timeSlot.getId(),
                startTime,
                endTime);

        Showtime saved = showtimeRepository.save(showtime);
        initializeShowtimeSeats(saved, room.getId(), timeSlot.getPriceMultiplier(), room.getPriceMultiplier());
        return saved;
    }

    private ShowtimeDTO.Response buildPreviewResponse(Movie movie, Room room, LocalDateTime startTime) {
        resolveTimeSlot(startTime);

        ShowtimeDTO.Response dto = new ShowtimeDTO.Response();
        dto.setId(null);
        dto.setMovieId(movie.getId());
        dto.setRoomId(room.getId());
        dto.setStartTime(startTime);
        dto.setEndTime(startTime.plusMinutes(movie.getDurationMinutes()));
        dto.setStatus("PREVIEW");
        dto.setMovieTitle(movie.getTitle());
        dto.setRoomName(room.getName());
        dto.setMovieDuration(movie.getDurationMinutes());
        return dto;
    }

    private void initializeShowtimeSeats(Showtime showtime, Long roomId, BigDecimal timeSlotMultiplier,
            BigDecimal roomMultiplier) {
        List<Seat> originalSeats = seatRepository.findByRoomIdAndStatus(roomId, SeatStatus.ACTIVE);
        List<ShowtimeSeat> showtimeSeats = new ArrayList<>();
        BigDecimal effectiveRoomMultiplier = roomMultiplier != null ? roomMultiplier : BigDecimal.ONE;

        for (Seat seat : originalSeats) {
            BigDecimal finalPrice = seat.getBasePrice()
                    .multiply(timeSlotMultiplier)
                    .multiply(effectiveRoomMultiplier)
                    .setScale(0, RoundingMode.HALF_UP);

            showtimeSeats.add(new ShowtimeSeat(showtime, seat, finalPrice));
        }

        showtimeSeatRepository.saveAll(showtimeSeats);
    }

    private void validateRoomAvailability(Long roomId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludedShowtimeId) {
        LocalDateTime overlapStart = startTime.minusMinutes(CLEANUP_MINUTES);
        LocalDateTime overlapEnd = endTime.plusMinutes(CLEANUP_MINUTES);

        List<Showtime> overlaps = excludedShowtimeId == null
                ? showtimeRepository.findOverlapping(roomId, overlapStart, overlapEnd, ShowtimeStatus.CANCELLED)
                : showtimeRepository.findOverlappingExcludingId(
                        roomId, excludedShowtimeId, overlapStart, overlapEnd, ShowtimeStatus.CANCELLED);

        if (!overlaps.isEmpty()) {
            throw new RuntimeException("Phòng chiếu đã trùng lịch hoặc chưa đủ 15 phút dọn dẹp");
        }
    }

    /**
     * [SOFT RULE - Option B] Kiểm tra cảnh báo khi chiếu cùng phim liên tiếp.
     * Không ném exception, chỉ trả về message cảnh báo hoặc null nếu không có vấn
     * đề.
     */
    private String checkConsecutiveMovieWarning(Long roomId, Long movieId,
            LocalDateTime startTime, Long excludedShowtimeId) {
        List<Showtime> roomShowtimes = showtimeRepository.findByRoom_IdAndStatusNotOrderByStartTimeAsc(
                roomId, ShowtimeStatus.CANCELLED).stream()
                .filter(showtime -> !Objects.equals(showtime.getId(), excludedShowtimeId))
                .collect(Collectors.toList());

        Showtime previous = null;
        Showtime next = null;

        for (Showtime showtime : roomShowtimes) {
            if (showtime.getStartTime().isBefore(startTime)) {
                previous = showtime;
            } else if (showtime.getStartTime().isAfter(startTime)) {
                next = showtime;
                break;
            }
        }

        boolean prevConflict = previous != null && Objects.equals(previous.getMovieId(), movieId);
        boolean nextConflict = next != null && Objects.equals(next.getMovieId(), movieId);

        if (prevConflict || nextConflict) {
            return "Cảnh báo: Phim này đang được xếp chiếu liên tiếp trong cùng phòng. "
                    + "Hệ thống vẫn tạo lịch thành công, nhưng bạn nên cân nhắc xếp xen kẽ với phim khác.";
        }
        return null;
    }

    private List<Movie> resolveMoviesForGeneration(List<Long> requestedMovieIds, LocalDate scheduleDate) {
        List<Movie> movies = movieRepository.findMoviesShowingOnDate(scheduleDate).stream()
                .filter(movie -> movie.getStatus() == MovieStatus.NOW_SHOWING)
                .collect(Collectors.toList());

        if (requestedMovieIds == null || requestedMovieIds.isEmpty()) {
            return movies.stream()
                    .sorted(Comparator.comparing(Movie::getDurationMinutes).thenComparing(Movie::getTitle))
                    .collect(Collectors.toList());
        }

        return movies.stream()
                .filter(movie -> requestedMovieIds.contains(movie.getId()))
                .sorted(Comparator.comparing(Movie::getDurationMinutes).thenComparing(Movie::getTitle))
                .collect(Collectors.toList());
    }

    private List<Room> resolveRoomsForGeneration(List<Long> requestedRoomIds) {
        List<Room> rooms = requestedRoomIds == null || requestedRoomIds.isEmpty()
                ? roomRepository.findAll()
                : roomRepository.findAllById(requestedRoomIds);

        return rooms.stream()
                .filter(room -> room.getStatus() == RoomStatus.ACTIVE)
                .sorted(Comparator.comparing(room -> room.getTotalRows() * room.getTotalColumns(),
                        Comparator.reverseOrder()))
                .collect(Collectors.toList());
    }

    private Showtime findPreviousShowtime(List<Showtime> roomShowtimes, LocalDateTime beforeTime) {
        Showtime previousShowtime = null;
        for (Showtime showtime : roomShowtimes) {
            if (showtime.getStartTime().isBefore(beforeTime)) {
                previousShowtime = showtime;
                continue;
            }
            break;
        }
        return previousShowtime;
    }

    private boolean overlapsWindow(Showtime showtime, LocalDateTime windowStart, LocalDateTime windowEnd) {
        return showtime.getStartTime().isBefore(windowEnd) && showtime.getEndTime().isAfter(windowStart);
    }

    private LocalDateTime resolveWindowEnd(LocalDate scheduleDate, LocalTime openingTime, LocalTime closingTime) {
        LocalDateTime end = scheduleDate.atTime(closingTime);
        if (!closingTime.isAfter(openingTime)) {
            end = end.plusDays(1);
        }
        return end;
    }

    private LocalDateTime resolveFutureWindowStart(LocalDate scheduleDate, LocalTime openingTime, LocalDateTime windowEnd) {
        LocalDateTime requestedStart = scheduleDate.atTime(openingTime);
        LocalDateTime now = LocalDateTime.now();

        if (!now.isBefore(windowEnd) && now.isAfter(requestedStart)) {
            return windowEnd;
        }

        if (!now.isBefore(requestedStart)) {
            return roundUpToFiveMinuteMark(now.plusSeconds(1));
        }

        return roundUpToFiveMinuteMark(requestedStart);
    }

    public static LocalDateTime roundUpToFiveMinuteMark(LocalDateTime value) {
        int minute = value.getMinute();
        int remainder = minute % 5;
        if (remainder == 0 && value.getSecond() == 0 && value.getNano() == 0) {
            return value.withSecond(0).withNano(0);
        }

        int minutesToAdd = remainder == 0 ? 5 : 5 - remainder;
        return value.plusMinutes(minutesToAdd)
                .withSecond(0)
                .withNano(0);
    }

    private TimeSlot resolveTimeSlot(LocalDateTime startTime) {
        return timeSlotRepository.findMatchingByTime(startTime.toLocalTime()).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy khung giờ phù hợp cho suất chiếu này tại mốc "
                                + startTime.toLocalTime()
                                + ". Hãy kiểm tra TimeSlot có bị hở biên giờ hoặc thiếu khung giờ hay không."));
    }

    private Room getActiveRoom(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Phòng chiếu không tồn tại với ID: " + roomId));
        if (room.getStatus() != RoomStatus.ACTIVE) {
            throw new RuntimeException("Chỉ có thể tạo lịch trong phòng đang hoạt động");
        }
        return room;
    }

    private Movie getSchedulableMovie(Long movieId, LocalDate scheduleDate) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));
        if (movie.getStatus() != MovieStatus.NOW_SHOWING) {
            throw new RuntimeException("Chỉ có thể xếp lịch cho phim đang chiếu");
        }
        if (movie.getReleaseDate() != null && movie.getReleaseDate().isAfter(scheduleDate)) {
            throw new RuntimeException("Phim chưa đến ngày khởi chiếu");
        }
        if (movie.getEndDate() != null && movie.getEndDate().isBefore(scheduleDate)) {
            throw new RuntimeException("Phim đã hết hạn chiếu");
        }
        return movie;
    }

    private Showtime getShowtime(Long showtimeId) {
        return showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại"));
    }

    private void ensureShowtimeEditable(Showtime showtime) {
        if (!showtime.getStartTime().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Không thể sửa hoặc xóa suất chiếu đã bắt đầu hoặc đã trôi qua");
        }

        List<ShowtimeSeat> showtimeSeats = showtimeSeatRepository.findByShowtimeId(showtime.getId());
        boolean hasLockedSeat = showtimeSeats.stream()
                .map(ShowtimeSeat::getStatus)
                .anyMatch(status -> status == SeatBookingStatus.HELD || status == SeatBookingStatus.SOLD);
        if (hasLockedSeat) {
            throw new RuntimeException("Không thể sửa hoặc xóa suất chiếu đã có ghế được giữ hoặc bán");
        }
    }

    private void deleteShowtimeSeats(Long showtimeId) {
        showtimeSeatRepository.deleteByShowtimeId(showtimeId);
        showtimeSeatRepository.flush();
    }

    private Integer getMovieDuration(Long movieId) {
        return movieRepository.findById(movieId)
                .map(Movie::getDurationMinutes)
                .orElse(120);
    }

    private String getMovieTitle(Long movieId) {
        return movieRepository.findById(movieId)
                .map(Movie::getTitle)
                .orElse("Unknown Movie");
    }

    private ShowtimeDTO.Response mapToResponse(Showtime entity) {
        ShowtimeDTO.Response dto = new ShowtimeDTO.Response();
        dto.setId(entity.getId());
        dto.setMovieId(entity.getMovieId());
        dto.setRoomId(entity.getRoom().getId());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setStatus(entity.getStatus().name());
        dto.setRoomName(entity.getRoom().getName());
        dto.setMovieTitle(getMovieTitle(entity.getMovieId()));
        dto.setMovieDuration(getMovieDuration(entity.getMovieId()));
        return dto;
    }

    private LocalDateTime max(LocalDateTime first, LocalDateTime second) {
        return first.isAfter(second) ? first : second;
    }

    private static final class RoomGenerationState {
        private final Room room;
        private final int roomIndex;
        private final List<Showtime> anchors;
        private int nextAnchorIndex;
        private LocalDateTime cursor;
        private Long previousMovieId;

        private RoomGenerationState(Room room,
                int roomIndex,
                List<Showtime> anchors,
                int nextAnchorIndex,
                LocalDateTime cursor,
                Long previousMovieId) {
            this.room = room;
            this.roomIndex = roomIndex;
            this.anchors = anchors;
            this.nextAnchorIndex = nextAnchorIndex;
            this.cursor = cursor;
            this.previousMovieId = previousMovieId;
        }

        private Showtime peekNextAnchor() {
            if (nextAnchorIndex >= anchors.size()) {
                return null;
            }
            return anchors.get(nextAnchorIndex);
        }
    }
}
