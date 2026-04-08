package com.astracine.backend.presentation.controller.client;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return ResponseEntity.ok(ChatResponse.builder()
                    .reply("Vui lòng đăng nhập để có thể nhắn tin với chatbox.")
                    .usedAi(false)
                    .source("auth-required")
                    .suggestedMovies(List.of())
                    .suggestedShowtimes(List.of())
                    .sessionId(request.getSessionId())
                    .suggestedCombos(List.of())
                    .build());
        }
        String userId = user.getUsername();
        return ResponseEntity.ok(clientChatboxService.chat(request, userId));
    }
}
