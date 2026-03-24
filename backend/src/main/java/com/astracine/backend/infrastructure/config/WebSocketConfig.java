package com.astracine.backend.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Comma-separated list, ví dụ:
     * app.ws.allowedOrigins=http://localhost:5173,http://localhost:3000
     */
    @Value("${app.ws.allowedOrigins:*}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Client subscribe /topic/**, /queue/**
        config.enableSimpleBroker("/topic", "/queue");
        // Client send lên /app/** nếu sau này bạn muốn dùng @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
        // User-specific destination: /user/queue/**
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toArray(String[]::new);

        String[] allowed = origins.length == 0 ? new String[] { "*" } : origins;

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowed);

        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns(allowed)
                .withSockJS();
    }

}
