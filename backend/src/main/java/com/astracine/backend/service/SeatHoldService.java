package com.astracine.backend.service;

import com.astracine.backend.dto.hold.HoldResponse;
import com.astracine.backend.dto.seat.SeatDisplayStatus;
import com.astracine.backend.dto.seat.SeatStateDto;
import com.astracine.backend.dto.ws.SeatEventDto;
import com.astracine.backend.dto.ws.SeatEventType;
import com.astracine.backend.entity.Seat;
import com.astracine.backend.entity.Showtime;
import com.astracine.backend.entity.ShowtimeSeat;
import com.astracine.backend.entity.ShowtimeSeatStatus;
import com.astracine.backend.enums.SeatBookingStatus;
import com.astracine.backend.enums.SeatType;
import com.astracine.backend.exception.HoldConflictException;
import com.astracine.backend.exception.HoldNotFoundException;
import com.astracine.backend.exception.HoldUnauthorizedException;
import com.astracine.backend.exception.SeatAlreadySoldException;
import com.astracine.backend.repository.SeatRepository;
import com.astracine.backend.repository.ShowtimeRepository;
import com.astracine.backend.repository.ShowtimeSeatRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SeatHoldService {

    private static final String HOLD_SEAT_KEY_PREFIX = "hold:seat:"; // hold:seat:{showtimeId}:{seatId}
    private static final String HOLD_SUMMARY_KEY_PREFIX = "hold:summary:"; // hold:summary:{holdId}
    private static final String HOLD_EXPIRATION_ZSET = "hold:expirations";

    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final StringRedisTemplate redis;
    private final SeatEventPublisher publisher;

    private final long ttlSeconds;
    private final long summaryTtlBufferSeconds;

    private final DefaultRedisScript<List> holdSeatsScript;
    private final DefaultRedisScript<Long> releaseSeatsScript;
    private final DefaultRedisScript<Long> renewSeatsScript;

    public SeatHoldService(
            SeatRepository seatRepository,
            ShowtimeRepository showtimeRepository,
            ShowtimeSeatRepository showtimeSeatRepository,
            StringRedisTemplate redis,
            SeatEventPublisher publisher,
            @Value("${app.seatHold.ttlSeconds:300}") long ttlSeconds,
            @Value("${app.seatHold.summaryTtlBufferSeconds:60}") long summaryTtlBufferSeconds
    ) {
        this.seatRepository = seatRepository;
        this.showtimeRepository = showtimeRepository;
        this.showtimeSeatRepository = showtimeSeatRepository;
        this.redis = redis;
        this.publisher = publisher;
        this.ttlSeconds = ttlSeconds;
        this.summaryTtlBufferSeconds = summaryTtlBufferSeconds;

        this.holdSeatsScript = new DefaultRedisScript<>();
        this.holdSeatsScript.setResultType(List.class);
        this.holdSeatsScript.setScriptText(HOLD_SEATS_LUA);

        this.releaseSeatsScript = new DefaultRedisScript<>();
        this.releaseSeatsScript.setResultType(Long.class);
        this.releaseSeatsScript.setScriptText(RELEASE_SEATS_LUA);

        this.renewSeatsScript = new DefaultRedisScript<>();
        this.renewSeatsScript.setResultType(Long.class);
        this.renewSeatsScript.setScriptText(RENEW_SEATS_LUA);
    }

    // ===============================
    // Public APIs
    // ===============================

    public List<SeatStateDto> getSeatStates(Long showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Showtime not found: " + showtimeId));

        List<Seat> seats = seatRepository.findByRoomId(showtime.getRoom().getId());
        seats.sort(Comparator
                .comparing(Seat::getRowLabel)
                .thenComparing(Seat::getColumnNumber));

        Set<Long> soldSeatIds = new HashSet<>(
                showtimeSeatRepository.findSeatIdsByShowtimeAndStatus(showtimeId, SeatBookingStatus.SOLD)
        );

        // Multi-get holds for all seats (không scan pattern, tránh nặng)
        List<String> holdKeys = seats.stream()
                .map(s -> seatHoldKey(showtimeId, s.getId()))
                .collect(Collectors.toList());

        List<String> values = redis.opsForValue().multiGet(holdKeys);
        Map<Long, Long> heldExpiresBySeatId = new HashMap<>();
        if (values != null) {
            for (int i = 0; i < values.size(); i++) {
                String v = values.get(i);
                if (v == null) continue;
                Long seatId = seats.get(i).getId();
                Long exp = parseExpiresAt(v);
                heldExpiresBySeatId.put(seatId, exp);
            }
        }

        List<SeatStateDto> out = new ArrayList<>(seats.size());
        for (Seat s : seats) {
            SeatDisplayStatus status;
            Long heldExpiresAt = null;

            if (soldSeatIds.contains(s.getId())) {
                status = SeatDisplayStatus.SOLD;
            } else if (heldExpiresBySeatId.containsKey(s.getId())) {
                status = SeatDisplayStatus.HELD;
                heldExpiresAt = heldExpiresBySeatId.get(s.getId());
            } else {
                status = SeatDisplayStatus.AVAILABLE;
            }

            out.add(SeatStateDto.builder()
                    .seatId(s.getId())
                    .rowLabel(s.getRowLabel())
                    .columnNumber(s.getColumnNumber())
                    .seatType(s.getSeatType())
                    .status(status)
                    .heldExpiresAt(heldExpiresAt)
                    .build());
        }

        return out;
    }

    public HoldResponse holdSeats(Long showtimeId, List<Long> seatIds, String userId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Showtime not found: " + showtimeId));

        // ensure seatIds belong to this showtime's room
        Set<Long> roomSeatIds = seatRepository.findByRoomId(showtime.getRoom().getId())
                .stream().map(Seat::getId).collect(Collectors.toSet());
        for (Long seatId : seatIds) {
            if (!roomSeatIds.contains(seatId)) {
                throw new IllegalArgumentException("Seat " + seatId + " does not belong to showtime's room");
            }
        }

        // sold check (DB)
        Set<Long> soldSeatIds = new HashSet<>(
                showtimeSeatRepository.findSeatIdsByShowtimeAndStatus(showtimeId, SeatBookingStatus.SOLD)
        );
        List<Long> soldConflicts = seatIds.stream().filter(soldSeatIds::contains).toList();
        if (!soldConflicts.isEmpty()) {
            throw new SeatAlreadySoldException(showtimeId, soldConflicts);
        }

        String holdId = UUID.randomUUID().toString();
        long expiresAt = Instant.now().plusSeconds(ttlSeconds).toEpochMilli();
        String value = holdValue(holdId, userId, expiresAt);

        List<String> keys = seatIds.stream()
                .map(seatId -> seatHoldKey(showtimeId, seatId))
                .toList();

        // Lua: nếu seat nào đã có hold -> trả về list index (1-based)
        List<?> conflictIdx = redis.execute(holdSeatsScript, keys, value, String.valueOf(ttlSeconds));
        if (conflictIdx != null && !conflictIdx.isEmpty()) {
            List<Long> conflictSeatIds = new ArrayList<>();
            for (Object idxObj : conflictIdx) {
                int idx = ((Number) idxObj).intValue();
                // Lua trả 1-based
                int seatIndex = idx - 1;
                if (seatIndex >= 0 && seatIndex < seatIds.size()) {
                    conflictSeatIds.add(seatIds.get(seatIndex));
                }
            }
            throw new HoldConflictException(showtimeId, conflictSeatIds);
        }

        // hold summary (buffer TTL để scheduler còn đọc được khi seat-key đã expire)
        String summaryKey = holdSummaryKey(holdId);
        String summaryValue = summaryValue(showtimeId, userId, expiresAt, seatIds);
        redis.opsForValue().set(summaryKey, summaryValue, Duration.ofSeconds(ttlSeconds + summaryTtlBufferSeconds));

        // zset expiration
        redis.opsForZSet().add(HOLD_EXPIRATION_ZSET, holdId, expiresAt);

        // broadcast
        publisher.publish(showtimeId, SeatEventDto.builder()
                .type(SeatEventType.SEAT_HELD)
                .showtimeId(showtimeId)
                .seatIds(seatIds)
                .holdId(holdId)
                .byUserId(userId)
                .expiresAt(expiresAt)
                .build());

        return HoldResponse.builder()
                .holdId(holdId)
                .showtimeId(showtimeId)
                .seatIds(seatIds)
                .expiresAt(expiresAt)
                .ttlSeconds(ttlSeconds)
                .build();
    }

    public void releaseHold(String holdId, String userId) {
        HoldSummary summary = getAndValidateHoldSummary(holdId, userId);
        cleanupHoldKeys(summary.showtimeId, holdId, userId, summary.seatIds);

        // broadcast release
        publisher.publish(summary.showtimeId, SeatEventDto.builder()
                .type(SeatEventType.SEAT_RELEASED)
                .showtimeId(summary.showtimeId)
                .seatIds(summary.seatIds)
                .holdId(holdId)
                .build());
    }

    public HoldResponse renewHold(String holdId, String userId) {
        HoldSummary summary = getAndValidateHoldSummary(holdId, userId);

        long newExpiresAt = Instant.now().plusSeconds(ttlSeconds).toEpochMilli();
        String newValue = holdValue(holdId, userId, newExpiresAt);
        String prefix = holdPrefix(holdId, userId);

        List<String> seatKeys = summary.seatIds.stream()
                .map(seatId -> seatHoldKey(summary.showtimeId, seatId))
                .toList();

        Long ok = redis.execute(renewSeatsScript, seatKeys, prefix, newValue, String.valueOf(ttlSeconds));
        if (ok == null || ok == 0L) {
            // seat keys đã expire / không còn match => coi như hold đã hết
            throw new HoldNotFoundException(holdId);
        }

        // update summary + zset
        String summaryKey = holdSummaryKey(holdId);
        redis.opsForValue().set(summaryKey,
                summaryValue(summary.showtimeId, userId, newExpiresAt, summary.seatIds),
                Duration.ofSeconds(ttlSeconds + summaryTtlBufferSeconds));
        redis.opsForZSet().add(HOLD_EXPIRATION_ZSET, holdId, newExpiresAt);

        return HoldResponse.builder()
                .holdId(holdId)
                .showtimeId(summary.showtimeId)
                .seatIds(summary.seatIds)
                .expiresAt(newExpiresAt)
                .ttlSeconds(ttlSeconds)
                .build();
    }

    @Transactional
    public void confirmHoldToSold(String holdId, String userId) {
        HoldSummary summary = getAndValidateHoldSummary(holdId, userId);

        // verify seat keys still exist (hold chưa hết)
        String firstKey = seatHoldKey(summary.showtimeId, summary.seatIds.get(0));
        String v = redis.opsForValue().get(firstKey);
        if (v == null || !v.startsWith(holdPrefix(holdId, userId))) {
            throw new HoldNotFoundException(holdId);
        }

        Showtime showtime = showtimeRepository.findById(summary.showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Showtime not found: " + summary.showtimeId));

        // Double-check sold in DB inside transaction
        Set<Long> soldSeatIds = new HashSet<>(
                showtimeSeatRepository.findSeatIdsByShowtimeAndStatus(summary.showtimeId, SeatBookingStatus.SOLD)
        );
        List<Long> soldConflicts = summary.seatIds.stream().filter(soldSeatIds::contains).toList();
        if (!soldConflicts.isEmpty()) {
            throw new SeatAlreadySoldException(summary.showtimeId, soldConflicts);
        }

        // mark sold
        for (Long seatId : summary.seatIds) {
            ShowtimeSeat ss = showtimeSeatRepository.findByShowtimeIdAndSeatId(summary.showtimeId, seatId)
                    .orElseGet(() -> {
                        ShowtimeSeat created = new ShowtimeSeat();
                        created.setShowtime(showtime);
                        // tránh insert Seat mới: dùng reference
                        created.setSeat(seatRepository.getReferenceById(seatId));
                        return created;
                    });

            ss.setStatus(SeatBookingStatus.SOLD);
            showtimeSeatRepository.save(ss);
        }

        // cleanup hold keys + summary (KHÔNG broadcast RELEASED để tránh UI nhấp nháy AVAILABLE)
        cleanupHoldKeys(summary.showtimeId, holdId, userId, summary.seatIds);

        // broadcast sold
        publisher.publish(summary.showtimeId, SeatEventDto.builder()
                .type(SeatEventType.SEAT_SOLD)
                .showtimeId(summary.showtimeId)
                .seatIds(summary.seatIds)
                .build());
    }

    /**
     * Called by scheduler: phát hiện hold quá hạn để broadcast SEAT_RELEASED.
     * Lưu ý: seat keys có thể đã tự expire rồi.
     */
    public void handleExpiredHold(String holdId) {
        String summaryRaw = redis.opsForValue().get(holdSummaryKey(holdId));
        if (summaryRaw == null) {
            redis.opsForZSet().remove(HOLD_EXPIRATION_ZSET, holdId);
            return;
        }
        HoldSummary summary = parseSummary(summaryRaw);

        // best-effort cleanup
        List<String> seatKeys = summary.seatIds.stream()
                .map(seatId -> seatHoldKey(summary.showtimeId, seatId))
                .toList();
        redis.delete(seatKeys);
        redis.delete(holdSummaryKey(holdId));
        redis.opsForZSet().remove(HOLD_EXPIRATION_ZSET, holdId);

        publisher.publish(summary.showtimeId, SeatEventDto.builder()
                .type(SeatEventType.SEAT_RELEASED)
                .showtimeId(summary.showtimeId)
                .seatIds(summary.seatIds)
                .holdId(holdId)
                .build());
    }

    public Set<String> findExpiredHoldIds(long nowEpochMillis, int limit) {
        ZSetOperations<String, String> z = redis.opsForZSet();
        return z.rangeByScore(HOLD_EXPIRATION_ZSET, 0, nowEpochMillis, 0, limit);
    }

    // ===============================
    // Helpers
    // ===============================

    private HoldSummary getAndValidateHoldSummary(String holdId, String userId) {
        String summaryRaw = redis.opsForValue().get(holdSummaryKey(holdId));
        if (summaryRaw == null) {
            throw new HoldNotFoundException(holdId);
        }

        HoldSummary summary = parseSummary(summaryRaw);
        if (!Objects.equals(summary.userId, userId)) {
            throw new HoldUnauthorizedException();
        }
        return summary;
    }

    private void cleanupHoldKeys(Long showtimeId, String holdId, String userId, List<Long> seatIds) {
        List<String> seatKeys = seatIds.stream()
                .map(seatId -> seatHoldKey(showtimeId, seatId))
                .toList();

        // chỉ xóa nếu key còn thuộc hold này (tránh xóa nhầm)
        String prefix = holdPrefix(holdId, userId);
        redis.execute(releaseSeatsScript, seatKeys, prefix);

        redis.delete(holdSummaryKey(holdId));
        redis.opsForZSet().remove(HOLD_EXPIRATION_ZSET, holdId);
    }

    private static String seatHoldKey(Long showtimeId, Long seatId) {
        return HOLD_SEAT_KEY_PREFIX + showtimeId + ":" + seatId;
    }

    private static String holdSummaryKey(String holdId) {
        return HOLD_SUMMARY_KEY_PREFIX + holdId;
    }

    private static String holdValue(String holdId, String userId, long expiresAt) {
        // format: {holdId}|{userId}|{expiresAt}
        return holdId + "|" + userId + "|" + expiresAt;
    }

    private static String holdPrefix(String holdId, String userId) {
        return holdId + "|" + userId + "|";
    }

    private static Long parseExpiresAt(String holdValue) {
        // {holdId}|{userId}|{expiresAt}
        String[] parts = holdValue.split("\\|");
        if (parts.length < 3) return null;
        try {
            return Long.parseLong(parts[2]);
        } catch (Exception e) {
            return null;
        }
    }

    /** summary format: showtimeId|userId|expiresAt|seatId1,seatId2,... */
    private static String summaryValue(Long showtimeId, String userId, long expiresAt, List<Long> seatIds) {
        String seatsCsv = seatIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        return showtimeId + "|" + userId + "|" + expiresAt + "|" + seatsCsv;
    }

    private static HoldSummary parseSummary(String raw) {
        String[] parts = raw.split("\\|", 4);
        if (parts.length < 4) {
            throw new IllegalArgumentException("Invalid hold summary: " + raw);
        }
        Long showtimeId = Long.parseLong(parts[0]);
        String userId = parts[1];
        long expiresAt = Long.parseLong(parts[2]);
        List<Long> seatIds = Arrays.stream(parts[3].split(","))
                .filter(s -> !s.isBlank())
                .map(Long::parseLong)
                .toList();
        return new HoldSummary(showtimeId, userId, expiresAt, seatIds);
    }

    private record HoldSummary(Long showtimeId, String userId, long expiresAt, List<Long> seatIds) {
    }

    // ===============================
    // Lua scripts
    // ===============================

    /**
     * KEYS: seat hold keys
     * ARGV[1]: value (holdId|userId|expiresAt)
     * ARGV[2]: ttl seconds
     * return: list of conflict indexes (1-based). empty list => success
     */
    private static final String HOLD_SEATS_LUA = """
            local conflicts = {}
            for i=1,#KEYS do
              if redis.call('EXISTS', KEYS[i]) == 1 then
                table.insert(conflicts, i)
              end
            end
            if #conflicts > 0 then
              return conflicts
            end
            local val = ARGV[1]
            local ttl = tonumber(ARGV[2])
            for i=1,#KEYS do
              redis.call('SET', KEYS[i], val, 'EX', ttl, 'NX')
            end
            return {}
            """;

    /**
     * KEYS: seat hold keys
     * ARGV[1]: prefix = holdId|userId|
     * return: number deleted
     */
    private static final String RELEASE_SEATS_LUA = """
            local prefix = ARGV[1]
            local deleted = 0
            for i=1,#KEYS do
              local v = redis.call('GET', KEYS[i])
              if v ~= false then
                if string.sub(v, 1, string.len(prefix)) == prefix then
                  redis.call('DEL', KEYS[i])
                  deleted = deleted + 1
                end
              end
            end
            return deleted
            """;

    /**
     * KEYS: seat hold keys
     * ARGV[1]: prefix = holdId|userId|
     * ARGV[2]: newValue
     * ARGV[3]: ttl seconds
     * return: 1 if all keys renewed, 0 otherwise
     */
    private static final String RENEW_SEATS_LUA = """
            local prefix = ARGV[1]
            local newVal = ARGV[2]
            local ttl = tonumber(ARGV[3])
            for i=1,#KEYS do
              local v = redis.call('GET', KEYS[i])
              if v == false then
                return 0
              end
              if string.sub(v, 1, string.len(prefix)) ~= prefix then
                return 0
              end
            end
            for i=1,#KEYS do
              redis.call('SET', KEYS[i], newVal, 'EX', ttl, 'XX')
            end
            return 1
            """;
}
