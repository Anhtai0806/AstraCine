package com.astracine.backend.infrastructure.config.seeder;

import com.astracine.backend.core.entity.SeatPriceConfig;
import com.astracine.backend.core.enums.SeatType;
import com.astracine.backend.core.repository.SeatPriceConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeatPriceConfigSeeder implements CommandLineRunner {

    private final SeatPriceConfigRepository seatPriceConfigRepository;

    @Override
    public void run(String... args) {
        if (seatPriceConfigRepository.count() == 0) {
            log.info("Initializing default seat price configurations...");

            SeatPriceConfig normal = new SeatPriceConfig(SeatType.NORMAL, new BigDecimal("50000"));
            SeatPriceConfig vip = new SeatPriceConfig(SeatType.VIP, new BigDecimal("80000"));
            SeatPriceConfig couple = new SeatPriceConfig(SeatType.COUPLE, new BigDecimal("70000"));
            SeatPriceConfig premium = new SeatPriceConfig(SeatType.PREMIUM, new BigDecimal("100000"));

            seatPriceConfigRepository.saveAll(Arrays.asList(normal, vip, couple, premium));
            log.info("Default seat price configurations initialized successfully.");
        }
    }
}
