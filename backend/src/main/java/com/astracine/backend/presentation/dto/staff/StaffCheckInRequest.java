package com.astracine.backend.presentation.dto.staff;

import java.util.List;

import lombok.Data;

@Data
public class StaffCheckInRequest {
    private List<Long> ticketIds;
}
