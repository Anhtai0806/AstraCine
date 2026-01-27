package com.astracine.backend.dto;

import com.astracine.backend.enums.SeatStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class SeatDTO {
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatMapResponse {
        // Ví dụ: trả về sơ đồ ghế
        private Long id;
        private String rowLabel;
        private int columnNumber;
        private SeatStatus status;
        private String type;
    }
}