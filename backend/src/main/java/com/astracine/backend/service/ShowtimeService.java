package com.astracine.backend.service;

import com.astracine.backend.dto.ShowtimeDTO; // Import DTO gom nhóm
import com.astracine.backend.entity.*;
import com.astracine.backend.enums.SeatStatus;
import com.astracine.backend.enums.ShowtimeStatus;
import com.astracine.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.EmptyResultDataAccessException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final SeatRepository seatRepository;
    private final TimeSlotRepository timeSlotRepository;
    
    // [THÊM MỚI] Cần Repo này để tìm Object Room từ ID
    private final RoomRepository roomRepository; 
    
    private final JdbcTemplate jdbcTemplate;

    /**
     * TẠO SUẤT CHIẾU MỚI
     */
    public Showtime createShowtime(ShowtimeDTO.CreateRequest request) {
        // 1. Lấy độ dài phim (Giả lập)
        Integer movieDuration = getMovieDuration(request.getMovieId());
        LocalDateTime startTime = request.getStartTime();
        LocalDateTime endTime = startTime.plusMinutes(movieDuration);

        // 2. Validate phòng trống
        validateRoomAvailability(request.getRoomId(), startTime, endTime);

        // 3. Tìm khung giờ (TimeSlot) tương ứng
        TimeSlot timeSlot = timeSlotRepository.findByTime(startTime.toLocalTime())
            .orElseThrow(() -> new RuntimeException("Không có khung giờ phù hợp (TimeSlot) cho giờ chiếu này"));

        // [THAY ĐỔI] 4. Tìm Object Room từ DB (Bắt buộc vì Entity Showtime chứa Object Room)
        Room room = roomRepository.findById(request.getRoomId())
            .orElseThrow(() -> new RuntimeException("Phòng chiếu không tồn tại với ID: " + request.getRoomId()));

        // 5. Lưu Showtime
        // Constructor này nhận tham số hỗn hợp: (Long movieId, Room room, Long timeSlotId, ...)
        Showtime showtime = new Showtime(
            request.getMovieId(),
            room,             // <-- Truyền Object Room vừa tìm được vào đây
            timeSlot.getId(), // <-- Truyền ID TimeSlot (vì TimeSlot chỉ lưu ID trong Entity)
            startTime,
            endTime
        );
        showtime = showtimeRepository.save(showtime);

        // 6. COPY ghế từ phòng sang suất chiếu và TÍNH GIÁ
        initializeShowtimeSeats(showtime, request.getRoomId(), timeSlot.getPriceMultiplier());

        return showtime;
    }

    private void initializeShowtimeSeats(Showtime showtime, Long roomId, BigDecimal multiplier) {
        List<Seat> originalSeats = seatRepository.findByRoomIdAndStatus(roomId, SeatStatus.ACTIVE);
        List<ShowtimeSeat> showtimeSeats = new ArrayList<>();

        for (Seat seat : originalSeats) {
            // Công thức: Giá cuối = Giá ghế gốc * Hệ số giờ chiếu
            BigDecimal finalPrice = seat.getBasePrice()
                .multiply(multiplier)
                .setScale(0, RoundingMode.HALF_UP);
        
             ShowtimeSeat showtimeSeat = new ShowtimeSeat(showtime, seat, finalPrice);
            showtimeSeats.add(showtimeSeat);
        }
        showtimeSeatRepository.saveAll(showtimeSeats);
    }

    /**
     * LẤY SƠ ĐỒ GHẾ (BOOKING MAP)
     */
    @Transactional(readOnly = true)
    public ShowtimeDTO.SeatMapResponse getSeatMap(Long showtimeId) {
        // 1. Query dữ liệu
        Showtime showtime = showtimeRepository.findById(showtimeId)
            .orElseThrow(() -> new RuntimeException("Suất chiếu không tồn tại"));
        
        TimeSlot timeSlot = timeSlotRepository.findById(showtime.getTimeSlotId())
            .orElseThrow(() -> new RuntimeException("Dữ liệu TimeSlot bị lỗi"));

        List<ShowtimeSeat> showtimeSeats = showtimeSeatRepository.findByShowtimeIdOrderBySeatIdAsc(showtimeId);
        
        // [LƯU Ý] Lấy ID phòng từ Object Room trong Showtime
        Long roomId = showtime.getRoom().getId(); 

        // Map ghế gốc để lấy thông tin hàng/cột
        Map<Long, Seat> seatMap = seatRepository.findByRoomIdOrderByRowLabelAscColumnNumberAsc(roomId)
            .stream().collect(Collectors.toMap(Seat::getId, s -> s));

        // 2. Gom nhóm ghế theo Hàng (RowLabel)
        Map<String, List<ShowtimeDTO.SeatInfo>> groupedSeats = new LinkedHashMap<>();

        for (ShowtimeSeat ss : showtimeSeats) {
            Seat seat = seatMap.get(ss.getSeat().getId());
            if (seat == null) continue;

            ShowtimeDTO.SeatInfo seatInfo = new ShowtimeDTO.SeatInfo(
                ss.getId(),
                seat.getRowLabel(),
                seat.getColumnNumber(),
                seat.getSeatType(),
                seat.getBasePrice(),
                ss.getFinalPrice(),
                ss.getStatus()
            );

            groupedSeats.computeIfAbsent(seat.getRowLabel(), k -> new ArrayList<>()).add(seatInfo);
        }

        // 3. Chuyển đổi sang List<SeatRow>
        List<ShowtimeDTO.SeatRow> seatRows = groupedSeats.entrySet().stream()
            .map(entry -> {
                List<ShowtimeDTO.SeatInfo> sortedSeats = entry.getValue().stream()
                    .sorted(Comparator.comparing(ShowtimeDTO.SeatInfo::getColumnNumber))
                    .collect(Collectors.toList());
                return new ShowtimeDTO.SeatRow(entry.getKey(), sortedSeats);
            })
            .collect(Collectors.toList());

        String movieTitle = getMovieTitle(showtime.getMovieId());

        return new ShowtimeDTO.SeatMapResponse(
            showtime.getId(),
            movieTitle,
            showtime.getStartTime(),
            timeSlot.getName(),
            timeSlot.getPriceMultiplier(),
            seatRows
        );
    }

    /**
     * Check trùng lịch chiếu
     */
    private void validateRoomAvailability(Long roomId, LocalDateTime start, LocalDateTime end) {
        List<Showtime> overlaps = showtimeRepository.findOverlapping(roomId, start, end, ShowtimeStatus.CANCELLED);
        if (!overlaps.isEmpty()) {
            throw new RuntimeException("Phòng chiếu đã bị trùng lịch trong khoảng thời gian này!");
        }
    }

    

    // --- JDBC Helpers ---

    private Integer getMovieDuration(Long movieId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT duration_minutes FROM movies WHERE id = ?", 
                Integer.class, 
                movieId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new RuntimeException("Không tìm thấy phim với ID: " + movieId);
        }
    }

    private String getMovieTitle(Long movieId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT title FROM movies WHERE id = ?", 
                String.class, 
                movieId
            );
        } catch (EmptyResultDataAccessException e) {
            return "Unknown Movie";
        }
    }

    @Transactional(readOnly = true)
public List<ShowtimeDTO.Response> getAllShowtimes() {
    return showtimeRepository.findAll().stream()
            .map(this::mapToResponse) // Gọi hàm map
            .collect(Collectors.toList());
}

// 2. Viết thêm hàm Mapper ở dưới cùng class
private ShowtimeDTO.Response mapToResponse(Showtime entity) {
    ShowtimeDTO.Response dto = new ShowtimeDTO.Response();
    dto.setId(entity.getId());
    dto.setMovieId(entity.getMovieId());
    dto.setRoomId(entity.getRoom().getId());
    dto.setStartTime(entity.getStartTime());
    dto.setEndTime(entity.getEndTime());
    dto.setStatus(entity.getStatus().name());

    // Map tên phòng (Lấy từ object Room lồng bên trong)
    dto.setRoomName(entity.getRoom().getName());

    // Map tên phim (Dùng hàm helper có sẵn của bạn)
    dto.setMovieTitle(getMovieTitle(entity.getMovieId()));
    dto.setMovieDuration(getMovieDuration(entity.getMovieId()));

    return dto;
}
}