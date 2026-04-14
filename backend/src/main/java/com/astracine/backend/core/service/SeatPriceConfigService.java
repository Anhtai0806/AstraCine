package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.SeatPriceConfig;
import com.astracine.backend.core.enums.SeatType;
import com.astracine.backend.core.repository.SeatPriceConfigRepository;
import com.astracine.backend.presentation.dto.SeatPriceConfigDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class SeatPriceConfigService {

    private final SeatPriceConfigRepository seatPriceConfigRepository;

    @Transactional(readOnly = true)
    public List<SeatPriceConfigDTO> getAllConfigs() {
        return seatPriceConfigRepository.findAll().stream()
                .map(entity -> new SeatPriceConfigDTO(entity.getSeatType(), entity.getBasePrice()))
                .collect(Collectors.toList());
    }

    public List<SeatPriceConfigDTO> updateConfigs(List<SeatPriceConfigDTO> dtos) {
        log.info("Updating {} seat price configurations", dtos.size());
        
        List<SeatPriceConfig> configs = dtos.stream()
                .map(dto -> {
                    log.debug("Mapping DTO: {} - {}", dto.getSeatType(), dto.getBasePrice());
                    return new SeatPriceConfig(dto.getSeatType(), dto.getBasePrice());
                })
                .collect(Collectors.toList());
        
        List<SeatPriceConfig> saved = seatPriceConfigRepository.saveAll(configs);
        log.info("Successfully updated {} seat price configurations", saved.size());
        
        return saved.stream()
                .map(entity -> new SeatPriceConfigDTO(entity.getSeatType(), entity.getBasePrice()))
                .collect(Collectors.toList());
    }
}
