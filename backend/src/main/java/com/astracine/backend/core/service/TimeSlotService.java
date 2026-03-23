package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.TimeSlot;
import com.astracine.backend.core.repository.TimeSlotRepository;
import com.astracine.backend.presentation.dto.TimeSlotDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimeSlotService {

    private final TimeSlotRepository timeSlotRepository;

    public List<TimeSlotDTO> getAllTimeSlots() {
        return timeSlotRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public TimeSlotDTO createTimeSlot(TimeSlotDTO dto) {
        validateTimeSlot(dto, null);
        TimeSlot timeSlot = mapToEntity(new TimeSlot(), dto);
        return mapToDTO(timeSlotRepository.save(timeSlot));
    }

    public TimeSlotDTO updateTimeSlot(Long id, TimeSlotDTO dto) {
        TimeSlot existing = timeSlotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khung giờ"));

        validateTimeSlot(dto, id);
        mapToEntity(existing, dto);
        return mapToDTO(timeSlotRepository.save(existing));
    }

    public void deleteTimeSlot(Long id) {
        timeSlotRepository.deleteById(id);
    }

    private void validateTimeSlot(TimeSlotDTO dto, Long excludedId) {
        if (dto.getStartTime() == null || dto.getEndTime() == null) {
            throw new RuntimeException("Giờ bắt đầu và giờ kết thúc không được để trống");
        }

        if (!dto.getStartTime().isBefore(dto.getEndTime())) {
            throw new RuntimeException("Giờ bắt đầu phải trước giờ kết thúc");
        }

        List<TimeSlot> overlapping = excludedId == null
                ? timeSlotRepository.findOverlapping(dto.getStartTime(), dto.getEndTime())
                : timeSlotRepository.findOverlappingExcludingId(excludedId, dto.getStartTime(), dto.getEndTime());

        if (!overlapping.isEmpty()) {
            TimeSlot conflict = overlapping.get(0);
            throw new RuntimeException("Khung giờ bị trùng với khung giờ đã tồn tại: "
                    + conflict.getName()
                    + " (" + conflict.getStartTime() + " - " + conflict.getEndTime() + ")");
        }
    }

    private TimeSlotDTO mapToDTO(TimeSlot entity) {
        TimeSlotDTO dto = new TimeSlotDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setStartTime(entity.getStartTime());
        dto.setEndTime(entity.getEndTime());
        dto.setPriceMultiplier(entity.getPriceMultiplier());
        dto.setStatus(entity.getStatus());
        return dto;
    }

    private TimeSlot mapToEntity(TimeSlot entity, TimeSlotDTO dto) {
        entity.setName(dto.getName());
        entity.setStartTime(dto.getStartTime());
        entity.setEndTime(dto.getEndTime());
        entity.setPriceMultiplier(dto.getPriceMultiplier());
        entity.setStatus(dto.getStatus());
        return entity;
    }
}
