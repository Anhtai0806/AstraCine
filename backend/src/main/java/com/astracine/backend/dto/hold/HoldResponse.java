package com.astracine.backend.dto.hold;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoldResponse {
    private String holdId;
    private Long showtimeId;
    private List<Long> seatIds;
    /** epoch millis */
    private Long expiresAt;
    /** ttl seconds */
    private Long ttlSeconds;
}
