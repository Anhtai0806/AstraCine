package com.astracine.backend.presentation.dto.movie;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenreDTO {
    private Long id;

    @NotBlank(message = "Genre name is required")
    private String name;
}
