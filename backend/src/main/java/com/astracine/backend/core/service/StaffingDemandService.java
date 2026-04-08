package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.entity.ShiftTemplate;
import com.astracine.backend.core.entity.StaffingDemand;
import com.astracine.backend.core.enums.ShowtimeStatus;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.core.repository.ShiftTemplateRepository;
import com.astracine.backend.core.repository.StaffingDemandRepository;
import com.astracine.backend.presentation.dto.staffschedule.StaffScheduleDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffingDemandService {

    private static final int MAX_STAFF_PER_SHIFT = 6;

    private final ShowtimeRepository showtimeRepository;
    private final StaffingDemandRepository staffingDemandRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;

    public List<StaffScheduleDTO.DemandWindowResponse> generate(
            LocalDate businessDate,
            Integer windowMinutes,
            boolean overwrite
    ) {
        if (overwrite) {
            staffingDemandRepository.deleteByBusinessDate(businessDate);
        } else if (!staffingDemandRepository.findByBusinessDateOrderByWindowStartAsc(businessDate).isEmpty()) {
            throw new RuntimeException("Ngày này đã có staffing demand draft");
        }

        LocalDateTime fromTime = businessDate.atStartOfDay();
        LocalDateTime toTime = businessDate.plusDays(1).atTime(6, 0);

        List<Showtime> showtimes = showtimeRepository.findByStartTimeBetweenAndStatusNot(
                fromTime,
                toTime,
                ShowtimeStatus.CANCELLED
        );

        List<ShiftTemplate> shiftTemplates = shiftTemplateRepository.findByActiveTrueOrderByStartTimeAsc();
        if (shiftTemplates.isEmpty()) {
            throw new RuntimeException("Chưa có shift template để ước lượng nhu cầu theo ca");
        }

        List<StaffingDemand> savedDemands = new ArrayList<>();

        for (ShiftTemplate shift : shiftTemplates) {
            final LocalDateTime shiftStart = businessDate.atTime(shift.getStartTime());

            final LocalDateTime rawShiftEnd = businessDate.atTime(shift.getEndTime());
            final LocalDateTime shiftEnd = !shift.getEndTime().isAfter(shift.getStartTime())
                    ? rawShiftEnd.plusDays(1)
                    : rawShiftEnd;

            List<Showtime> overlappingShowtimes = showtimes.stream()
                    .filter(showtime ->
                            overlapsShift(
                                    shiftStart,
                                    shiftEnd,
                                    showtime.getStartTime(),
                                    showtime.getEndTime()
                            )
                    )
                    .toList();

            StaffingDemand demand = buildShiftDemand(
                    businessDate,
                    shiftStart,
                    shiftEnd,
                    overlappingShowtimes
            );
            savedDemands.add(staffingDemandRepository.save(demand));
        }

        return savedDemands.stream()
                .map(this::mapDemand)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StaffScheduleDTO.DemandWindowResponse> getByDate(LocalDate businessDate) {
        return staffingDemandRepository.findByBusinessDateOrderByWindowStartAsc(businessDate)
                .stream()
                .map(this::mapDemand)
                .toList();
    }

    private StaffingDemand buildShiftDemand(
            LocalDate businessDate,
            LocalDateTime shiftStart,
            LocalDateTime shiftEnd,
            List<Showtime> overlappingShowtimes
    ) {
        int showtimeCount = overlappingShowtimes.size();

        int largeRoomCount = (int) overlappingShowtimes.stream()
                .filter(showtime -> showtime.getRoom() != null)
                .filter(showtime -> {
                    Integer totalRows = showtime.getRoom().getTotalRows();
                    Integer totalCols = showtime.getRoom().getTotalColumns();
                    int seats = (totalRows == null ? 0 : totalRows) * (totalCols == null ? 0 : totalCols);
                    return seats >= 80;
                })
                .count();

        int primeTimeCount = (int) overlappingShowtimes.stream()
                .filter(showtime -> {
                    int hour = showtime.getStartTime().getHour();
                    return hour >= 18 && hour <= 22;
                })
                .count();

        int counterRequired = showtimeCount == 0
                ? 1
                : Math.min(3, 1 + (showtimeCount >= 4 ? 1 : 0) + (primeTimeCount >= 2 ? 1 : 0));

        int checkinRequired = showtimeCount == 0
                ? 1
                : Math.min(3, 1 + (showtimeCount >= 3 ? 1 : 0) + (largeRoomCount >= 2 ? 1 : 0));

        int concessionRequired = showtimeCount == 0
                ? 1
                : Math.min(
                4,
                1
                        + (showtimeCount >= 2 ? 1 : 0)
                        + (primeTimeCount >= 2 ? 1 : 0)
                        + (largeRoomCount >= 2 ? 1 : 0)
        );

        int multiRequired = showtimeCount >= 5 || (primeTimeCount >= 2 && largeRoomCount >= 2)
                ? 1
                : 0;

        int[] capped = capShiftDemand(
                counterRequired,
                checkinRequired,
                concessionRequired,
                multiRequired,
                showtimeCount > 0
        );

        StaffingDemand demand = new StaffingDemand();
        demand.setBusinessDate(businessDate);
        demand.setWindowStart(shiftStart);
        demand.setWindowEnd(shiftEnd);
        demand.setCounterRequired(capped[0]);
        demand.setCheckinRequired(capped[1]);
        demand.setConcessionRequired(capped[2]);
        demand.setMultiRequired(capped[3]);
        return demand;
    }

    /**
     * Giới hạn tổng nhân sự 1 ca tối đa 6 người.
     * Ưu tiên giữ tối thiểu:
     * - nếu ca có showtime: Counter/Checkin/Concession giữ ít nhất 1
     * - Multi có thể bị cắt về 0 trước
     */
    private int[] capShiftDemand(
            int counterRequired,
            int checkinRequired,
            int concessionRequired,
            int multiRequired,
            boolean hasShowtime
    ) {
        int counter = Math.max(counterRequired, 0);
        int checkin = Math.max(checkinRequired, 0);
        int concession = Math.max(concessionRequired, 0);
        int multi = Math.max(multiRequired, 0);

        int total = counter + checkin + concession + multi;
        if (total <= MAX_STAFF_PER_SHIFT) {
            return new int[]{counter, checkin, concession, multi};
        }

        int minCounter = hasShowtime ? 1 : 0;
        int minCheckin = hasShowtime ? 1 : 0;
        int minConcession = hasShowtime ? 1 : 0;
        int minMulti = 0;

        while (total > MAX_STAFF_PER_SHIFT) {
            if (multi > minMulti) {
                multi--;
            } else if (concession > minConcession) {
                concession--;
            } else if (checkin > minCheckin) {
                checkin--;
            } else if (counter > minCounter) {
                counter--;
            } else {
                break;
            }
            total = counter + checkin + concession + multi;
        }

        return new int[]{counter, checkin, concession, multi};
    }

    private boolean overlapsShift(
            LocalDateTime shiftStart,
            LocalDateTime shiftEnd,
            LocalDateTime showtimeStart,
            LocalDateTime showtimeEnd
    ) {
        LocalDateTime bufferedStart = showtimeStart.minusMinutes(20);
        LocalDateTime bufferedEnd = (showtimeEnd != null ? showtimeEnd : showtimeStart.plusMinutes(120))
                .plusMinutes(20);

        return bufferedStart.isBefore(shiftEnd) && bufferedEnd.isAfter(shiftStart);
    }

    private StaffScheduleDTO.DemandWindowResponse mapDemand(StaffingDemand demand) {
        long durationMinutes = Duration.between(demand.getWindowStart(), demand.getWindowEnd()).toMinutes();

        String shiftCode = buildShiftCode(demand.getWindowStart(), demand.getWindowEnd());
        String shiftName = durationMinutes >= 300
                ? "Ca vận hành"
                : "Khung nhu cầu";

        return new StaffScheduleDTO.DemandWindowResponse(
                demand.getId(),
                demand.getBusinessDate(),
                demand.getWindowStart(),
                demand.getWindowEnd(),
                demand.getCounterRequired(),
                demand.getCheckinRequired(),
                demand.getConcessionRequired(),
                demand.getMultiRequired(),
                shiftCode,
                shiftName
        );
    }

    private String buildShiftCode(LocalDateTime start, LocalDateTime end) {
        return start.toLocalTime() + "_" + end.toLocalTime();
    }
}