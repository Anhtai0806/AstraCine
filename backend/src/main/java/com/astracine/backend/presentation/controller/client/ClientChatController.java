package com.astracine.backend.presentation.controller.client;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
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
            @AuthenticationPrincipal UserDetails user,
            @RequestHeader(value = "X-User-Id", required = false) String guestUserId) {
        String userId = user != null ? user.getUsername()
                : (guestUserId != null && !guestUserId.isBlank() ? guestUserId : "anonymous");
        return ResponseEntity.ok(clientChatboxService.chat(request, userId));
    }
}
