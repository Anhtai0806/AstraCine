package com.astracine.backend.core.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Set;

@Component
@EnableScheduling
public class SeatHoldExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeatHoldExpirationScheduler.class);

    private final SeatHoldService seatHoldService;
    private final int batchLimit;

    public SeatHoldExpirationScheduler(SeatHoldService seatHoldService,
            @Value("${app.seatHold.expireBatchLimit:200}") int batchLimit) {
        this.seatHoldService = seatHoldService;
        this.batchLimit = batchLimit;
    }

    @Scheduled(fixedDelayString = "${app.seatHold.expireCheckIntervalMs:2000}")
    public void scanAndReleaseExpiredHolds() {
        long now = Instant.now().toEpochMilli();
        Set<String> expired = seatHoldService.findExpiredHoldIds(now, batchLimit);
        if (expired == null || expired.isEmpty())
            return;

        for (String holdId : expired) {
            try {
                seatHoldService.handleExpiredHold(holdId);
            } catch (Exception e) {
                // best-effort - không muốn scheduler chết
                log.warn("Failed to handle expired hold {}: {}", holdId, e.getMessage());
            }
        }
    }
}
