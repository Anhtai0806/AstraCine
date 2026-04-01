package com.astracine.backend.presentation.dto.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {

    @NotBlank(message = "The role of the message cannot be left blank.")
    private String role;

    @NotBlank(message = "The content of the message cannot be left blank.")
    private String content;
}
