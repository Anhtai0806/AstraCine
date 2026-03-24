package com.astracine.backend.presentation.dto.hold;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class HoldRequest {
    @NotEmpty
    private List<@NotNull Long> seatIds;

    /** optional - idempotency key từ client */
    private String clientRequestId;
}
