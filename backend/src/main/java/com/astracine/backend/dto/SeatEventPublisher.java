package com.astracine.backend.dto;

import com.astracine.backend.dto.ws.SeatEventDto;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
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
