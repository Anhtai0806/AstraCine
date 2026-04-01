package com.astracine.backend.core.service;

import com.astracine.backend.presentation.dto.invoice.ETicketDTO;

public interface EmailService {

    void sendPasswordResetEmail(String toEmail, String username, String resetLink);

    void sendTicketEmail(String toEmail, ETicketDTO eTicket);
}
