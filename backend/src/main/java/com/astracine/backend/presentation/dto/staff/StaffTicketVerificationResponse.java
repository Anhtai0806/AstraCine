package com.astracine.backend.presentation.dto.staff;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffTicketVerificationResponse {
    private Long ticketId;
    private Long invoiceId;
    private String ticketCode;
    private String ticketStatus;
    private boolean canCheckIn;
    private String message;

    private String customerDisplay;
    private String movieTitle;
    private String roomName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String seatCode;
    private String seatType;
}
