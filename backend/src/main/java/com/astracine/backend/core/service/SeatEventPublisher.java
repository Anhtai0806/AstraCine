package com.astracine.backend.core.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.astracine.backend.presentation.dto.ws.SeatEventDto;

@Service("seatEventWsPublisher")
public class SeatEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public SeatEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publish(Long showtimeId, SeatEventDto event) {
        String topic = "/topic/showtimes/" + showtimeId + "/seats";
        messagingTemplate.convertAndSend(topic, event);
    }
}
