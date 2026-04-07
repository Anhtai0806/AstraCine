package com.astracine.backend.infrastructure.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "attendance.gps")
@Data
public class AttendanceGpsProperties {
    private double cinemaLatitude;
    private double cinemaLongitude;
    private double allowedRadiusMeters;
}
