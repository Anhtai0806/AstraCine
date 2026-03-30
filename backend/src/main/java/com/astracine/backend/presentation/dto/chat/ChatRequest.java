package com.astracine.backend.presentation.dto.chat;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {

    @NotBlank(message = "The question cannot be left blank.")
    private String message;

    @Valid
    private List<ChatMessageDTO> history;
}
