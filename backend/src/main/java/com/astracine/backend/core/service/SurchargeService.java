package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.HolidaySurcharge;
import com.astracine.backend.core.entity.WeekendSurchargeConfig;
import com.astracine.backend.core.repository.HolidaySurchargeRepository;
import com.astracine.backend.core.repository.WeekendSurchargeRepository;
import com.astracine.backend.presentation.dto.HolidaySurchargeDTO;
import com.astracine.backend.presentation.dto.WeekendSurchargeDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class SurchargeService {

    private final WeekendSurchargeRepository weekendRepo;
    private final HolidaySurchargeRepository holidayRepo;

    // ─── Weekend ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public WeekendSurchargeDTO getWeekendConfig() {
        WeekendSurchargeConfig config = weekendRepo.findById(1L)
                .orElse(new WeekendSurchargeConfig(1L, false, BigDecimal.ZERO));
        return new WeekendSurchargeDTO(config.getEnabled(), config.getSurchargeAmount());
    }

    public WeekendSurchargeDTO updateWeekendConfig(WeekendSurchargeDTO dto) {
        WeekendSurchargeConfig config = weekendRepo.findById(1L)
                .orElse(new WeekendSurchargeConfig());
        config.setId(1L);
        config.setEnabled(dto.getEnabled());
        config.setSurchargeAmount(dto.getSurchargeAmount());
        weekendRepo.save(config);
        log.info("Weekend surcharge updated: enabled={}, amount={}", dto.getEnabled(), dto.getSurchargeAmount());
        return dto;
    }

    // ─── Holidays ────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<HolidaySurchargeDTO> getAllHolidays() {
        return holidayRepo.findAllByOrderByStartDateDesc().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public HolidaySurchargeDTO createHoliday(HolidaySurchargeDTO dto) {
        validateDates(dto);
        HolidaySurcharge entity = new HolidaySurcharge();
        entity.setName(dto.getName());
        entity.setStartDate(dto.getStartDate());
        entity.setEndDate(dto.getEndDate());
        entity.setSurchargeAmount(dto.getSurchargeAmount());
        entity.setActive(dto.getActive() != null ? dto.getActive() : true);
        entity = holidayRepo.save(entity);
        log.info("Holiday surcharge created: {} ({} → {})", dto.getName(), dto.getStartDate(), dto.getEndDate());
        return toDTO(entity);
    }

    public HolidaySurchargeDTO updateHoliday(Long id, HolidaySurchargeDTO dto) {
        validateDates(dto);
        HolidaySurcharge entity = holidayRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ngày lễ với ID: " + id));
        entity.setName(dto.getName());
        entity.setStartDate(dto.getStartDate());
        entity.setEndDate(dto.getEndDate());
        entity.setSurchargeAmount(dto.getSurchargeAmount());
        if (dto.getActive() != null) entity.setActive(dto.getActive());
        entity = holidayRepo.save(entity);
        log.info("Holiday surcharge updated: id={}", id);
        return toDTO(entity);
    }

    public HolidaySurchargeDTO toggleHoliday(Long id) {
        HolidaySurcharge entity = holidayRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy ngày lễ với ID: " + id));
        entity.setActive(!entity.getActive());
        entity = holidayRepo.save(entity);
        log.info("Holiday surcharge toggled: id={}, active={}", id, entity.getActive());
        return toDTO(entity);
    }

    public void deleteHoliday(Long id) {
        if (!holidayRepo.existsById(id)) {
            throw new RuntimeException("Không tìm thấy ngày lễ với ID: " + id);
        }
        holidayRepo.deleteById(id);
        log.info("Holiday surcharge deleted: id={}", id);
    }

    // ─── Helpers ─────────────────────────────────────────

    private void validateDates(HolidaySurchargeDTO dto) {
        if (dto.getStartDate() != null && dto.getEndDate() != null && dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new RuntimeException("Ngày kết thúc phải sau ngày bắt đầu.");
        }
    }

    private HolidaySurchargeDTO toDTO(HolidaySurcharge entity) {
        return new HolidaySurchargeDTO(
                entity.getId(),
                entity.getName(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getSurchargeAmount(),
                entity.getActive()
        );
    }
}
