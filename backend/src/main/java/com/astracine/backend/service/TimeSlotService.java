package com.astracine.backend.service;

import com.astracine.backend.dto.TimeSlotDTO;
import com.astracine.backend.entity.TimeSlot;
import com.astracine.backend.repository.TimeSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimeSlotService { 

    private final TimeSlotRepository timeSlotRepository;

    // Lấy tất cả
    public List<TimeSlotDTO> getAllTimeSlots() {
        return timeSlotRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // Tạo mới
    public TimeSlotDTO createTimeSlot(TimeSlotDTO dto) {
        if (dto.getStartTime().isAfter(dto.getEndTime())) {
            throw new RuntimeException("Giờ bắt đầu phải trước giờ kết thúc");
        }
        TimeSlot timeSlot = mapToEntity(dto);
        return mapToDTO(timeSlotRepository.save(timeSlot));
    }

    // Xóa
    public void deleteTimeSlot(Long id) {
        timeSlotRepository.deleteById(id);
    }

    // --- Mapper thủ công (để đỡ cài thư viện) ---
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

    private TimeSlot mapToEntity(TimeSlotDTO dto) {
        TimeSlot entity = new TimeSlot();
        entity.setName(dto.getName());
        entity.setStartTime(dto.getStartTime());
        entity.setEndTime(dto.getEndTime());
        entity.setPriceMultiplier(dto.getPriceMultiplier());
        entity.setStatus(dto.getStatus());
        return entity;
    }
}