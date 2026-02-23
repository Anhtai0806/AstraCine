package com.astracine.backend.enums;

import lombok.Getter;

@Getter
public enum SeatType {
    NORMAL(50000),
    VIP(80000),
    COUPLE(120000),
    PREMIUM(100000);
    
    private final int basePrice;
    
    SeatType(int basePrice) {
        this.basePrice = basePrice;
    }
}
