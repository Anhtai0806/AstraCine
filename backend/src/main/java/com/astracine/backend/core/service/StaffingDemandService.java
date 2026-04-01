package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Showtime;
import com.astracine.backend.core.entity.StaffingDemand;
import com.astracine.backend.core.enums.ShowtimeStatus;
import com.astracine.backend.core.repository.ShowtimeRepository;
import com.astracine.backend.core.repository.StaffingDemandRepository;
import com.astracine.backend.presentation.dto.staffschedule.StaffScheduleDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffingDemandService {

    private final ShowtimeRepository showtimeRepository;
    private final StaffingDemandRepository staffingDemandRepository;

    public List<StaffScheduleDTO.DemandWindowResponse> generate(LocalDate businessDate, Integer windowMinutes, boolean overwrite) {
        int normalizedWindowMinutes = windowMinutes == null || windowMinutes <= 0 ? 30 : windowMinutes;
        if (overwrite) {
            staffingDemandRepository.deleteByBusinessDate(businessDate);
        } else if (!staffingDemandRepository.findByBusinessDateOrderByWindowStartAsc(businessDate).isEmpty()) {
            throw new RuntimeException("Ngày này đã có staffing demand draft");
        }

        LocalDateTime fromTime = businessDate.atStartOfDay();
        LocalDateTime toTime = businessDate.plusDays(1).atTime(6, 0);
        List<Showtime> showtimes = showtimeRepository.findByStartTimeBetweenAndStatusNot(fromTime, toTime, ShowtimeStatus.CANCELLED);

        Map<LocalDateTime, StaffingDemand> demandMap = new LinkedHashMap<>();
        for (LocalDateTime cursor = fromTime; cursor.isBefore(toTime); cursor = cursor.plusMinutes(normalizedWindowMinutes)) {
            StaffingDemand demand = new StaffingDemand();
            demand.setBusinessDate(businessDate);
            demand.setWindowStart(cursor);
            demand.setWindowEnd(cursor.plusMinutes(normalizedWindowMinutes));
            demandMap.put(cursor, demand);
        }

        for (Showtime showtime : showtimes) {
            applyDemand(demandMap, showtime.getStartTime().minusMinutes(45), showtime.getStartTime().plusMinutes(10), normalizedWindowMinutes, "COUNTER");
            applyDemand(demandMap, showtime.getStartTime().minusMinutes(30), showtime.getStartTime().plusMinutes(15), normalizedWindowMinutes, "CHECKIN");
            applyDemand(demandMap, showtime.getStartTime().minusMinutes(25), showtime.getStartTime().plusMinutes(5), normalizedWindowMinutes, "CONCESSION");
        }

        List<StaffingDemand> savedDemands = new ArrayList<>();
        for (StaffingDemand demand : demandMap.values()) {
            int totalPrimary = demand.getCounterRequired() + demand.getCheckinRequired() + demand.getConcessionRequired();
            demand.setMultiRequired(totalPrimary >= 5 ? 1 : 0);
            if (totalPrimary > 0 || demand.getMultiRequired() > 0) {
                savedDemands.add(staffingDemandRepository.save(demand));
            }
        }

        return savedDemands.stream().map(this::mapDemand).toList();
    }

    @Transactional(readOnly = true)
    public List<StaffScheduleDTO.DemandWindowResponse> getByDate(LocalDate businessDate) {
        return staffingDemandRepository.findByBusinessDateOrderByWindowStartAsc(businessDate)
                .stream()
                .map(this::mapDemand)
                .toList();
    }

    private void applyDemand(Map<LocalDateTime, StaffingDemand> demandMap,
                             LocalDateTime intervalStart,
                             LocalDateTime intervalEnd,
                             int windowMinutes,
                             String position) {
        for (Map.Entry<LocalDateTime, StaffingDemand> entry : demandMap.entrySet()) {
            LocalDateTime windowStart = entry.getKey();
            LocalDateTime windowEnd = windowStart.plusMinutes(windowMinutes);
            if (windowStart.isBefore(intervalEnd) && windowEnd.isAfter(intervalStart)) {
                StaffingDemand demand = entry.getValue();
                switch (position) {
                    case "COUNTER" -> demand.setCounterRequired(demand.getCounterRequired() + 1);
                    case "CHECKIN" -> demand.setCheckinRequired(demand.getCheckinRequired() + 1);
                    case "CONCESSION" -> demand.setConcessionRequired(demand.getConcessionRequired() + 1);
                    default -> {
                    }
                }
            }
        }
    }

    private StaffScheduleDTO.DemandWindowResponse mapDemand(StaffingDemand demand) {
        return new StaffScheduleDTO.DemandWindowResponse(
                demand.getId(),
                demand.getBusinessDate(),
                demand.getWindowStart(),
                demand.getWindowEnd(),
                demand.getCounterRequired(),
                demand.getCheckinRequired(),
                demand.getConcessionRequired(),
                demand.getMultiRequired());
    }
}
