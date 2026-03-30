package com.astracine.backend.presentation.controller.client;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.astracine.backend.core.service.ClientChatboxService;
import com.astracine.backend.presentation.dto.chat.ChatRequest;
import com.astracine.backend.presentation.dto.chat.ChatResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/public/chatbox")
@RequiredArgsConstructor
public class ClientChatController {

    private final ClientChatboxService clientChatboxService;

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(clientChatboxService.chat(request));
    }
}
