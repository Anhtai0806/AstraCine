package com.astracine.backend.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "payos")
public class PayOSProperties {

    private String clientId;
    private String apiKey;
    private String checksumKey;
}
