package com.astracine.backend.core.service;

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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ShowtimeService {

    private static final int CLEANUP_MINUTES = 15;

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final SeatRepository seatRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final RoomRepository roomRepository;
    private final MovieRepository movieRepository;

    public Showtime createShowtime(ShowtimeDTO.CreateRequest request) {
        Room room = getActiveRoom(request.getRoomId());
        Movie movie = getSchedulableMovie(request.getMovieId(), request.getStartTime().toLocalDate());
        validateShowtimeRules(room.getId(), movie.getId(), request.getStartTime(), movie.getDurationMinutes(), null);
        return saveShowtime(movie, room, request.getStartTime());
    }

    public ShowtimeDTO.BulkCreateResponse bulkCreateShowtimes(ShowtimeDTO.BulkCreateRequest request) {
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw new RuntimeException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }
        if (request.getStartTimes() == null || request.getStartTimes().isEmpty()) {
            throw new RuntimeException("Phải chọn ít nhất một khung giờ chiếu");
        }

        Room room = getActiveRoom(request.getRoomId());
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + request.getMovieId()));

        if (movie.getStatus() != MovieStatus.NOW_SHOWING) {
            throw new RuntimeException("Chỉ có thể xếp lịch cho phim đang chiếu");
        }

        List<ShowtimeDTO.Response> created = new ArrayList<>();
        List<String> skipped = new ArrayList<>();

        // Sắp xếp khung giờ theo thứ tự tăng dần
        List<LocalTime> sortedTimes = request.getStartTimes().stream()
                .sorted()
                .collect(Collectors.toList());

        // Lặp qua từng ngày trong giai đoạn
        LocalDate current = request.getStartDate();
        while (!current.isAfter(request.getEndDate())) {
            // Kiểm tra phim có hợp lệ trong ngày này không
            boolean movieValid = true;
            if (movie.getReleaseDate() != null && movie.getReleaseDate().isAfter(current)) {
                movieValid = false;
            }
            if (movie.getEndDate() != null && movie.getEndDate().isBefore(current)) {
                movieValid = false;
            }

            if (!movieValid) {
                skipped.add(current + ": Phim không khả dụng trong ngày này");
                current = current.plusDays(1);
                continue;
            }

            // Lặp qua từng khung giờ
            for (LocalTime time : sortedTimes) {
                LocalDateTime startTime = current.atTime(time);

                // Bỏ qua nếu thời gian đã qua
                if (!startTime.isAfter(LocalDateTime.now())) {
                    skipped.add(current + " " + time + ": Thời gian đã qua");
                    continue;
                }

                try {
                    validateShowtimeRules(room.getId(), movie.getId(), startTime, movie.getDurationMinutes(), null);
                    Showtime saved = saveShowtime(movie, room, startTime);
                    created.add(mapToResponse(saved));
                } catch (Exception e) {
                    skipped.add(current + " " + time + ": " + e.getMessage());
                }
            }

            current = current.plusDays(1);
        }

        String message;
        if (created.isEmpty()) {
            message = "Không tạo được suất chiếu nào. Tất cả khung giờ đều bị trùng hoặc không hợp lệ.";
        } else if (skipped.isEmpty()) {
            message = "Đã tạo thành công " + created.size() + " suất chiếu!";
        } else {
            message = "Đã tạo " + created.size() + " suất chiếu, bỏ qua " + skipped.size() + " khung giờ bị trùng.";
        }

        return new ShowtimeDTO.BulkCreateResponse(
                created.size(),
                skipped.size(),
                message,
                created,
                skipped);
    }

    public Showtime updateShowtime(Long showtimeId, ShowtimeDTO.CreateRequest request) {
        Showtime existing = getShowtime(showtimeId);
        ensureShowtimeEditable(existing);

        Room room = getActiveRoom(request.getRoomId());
        Movie movie = getSchedulableMovie(request.getMovieId(), request.getStartTime().toLocalDate());
        validateShowtimeRules(room.getId(), movie.getId(), request.getStartTime(), movie.getDurationMinutes(),
                showtimeId);

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
        return saved;
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

    private void initializeShowtimeSeats(Showtime showtime, Long roomId, BigDecimal timeSlotMultiplier, BigDecimal roomMultiplier) {
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

    private void validateShowtimeRules(Long roomId,
            Long movieId,
            LocalDateTime startTime,
            Integer durationMinutes,
            Long excludedShowtimeId) {
        LocalDateTime endTime = startTime.plusMinutes(durationMinutes);
        validateRoomAvailability(roomId, startTime, endTime, excludedShowtimeId);
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



    private TimeSlot resolveTimeSlot(LocalDateTime startTime) {
        return timeSlotRepository.findByTime(startTime.toLocalTime())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khung giờ phù hợp cho suất chiếu này"));
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
        List<ShowtimeSeat> showtimeSeats = showtimeSeatRepository.findByShowtimeId(showtimeId);
        if (!showtimeSeats.isEmpty()) {
            showtimeSeatRepository.deleteAll(showtimeSeats);
        }
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


}
