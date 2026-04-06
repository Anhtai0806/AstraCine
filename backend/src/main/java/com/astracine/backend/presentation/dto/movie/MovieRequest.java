package com.astracine.backend.presentation.dto.movie;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovieRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Duration is required")
    @Positive(message = "Duration must be positive")
    private Integer durationMinutes;

    @NotNull(message = "Release date is required")
    private LocalDate releaseDate;

    @NotNull(message = "End date is required")
    private LocalDate endDate;

    private String ageRating;

    private String status;

    private String trailerUrl;

    /**
     * Độ ưu tiên / độ hot của phim (1 = thấp, 5 = siêu hot).
     * Ảnh hưởng đến việc phim có được chiếu liên tiếp trong tự động xếp lịch hay không.
     */
    @NotNull(message = "Độ ưu tiên là bắt buộc")
    @Min(value = 1, message = "Độ ưu tiên phải từ 1 đến 5")
    @Max(value = 5, message = "Độ ưu tiên phải từ 1 đến 5")
    private Integer priority;

    private Set<Long> genreIds;
}
