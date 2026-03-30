package com.astracine.backend.infrastructure.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "gemini")
public class GeminiProperties {

    /**
     * Accepts values from application.properties or env var GEMINI_API_KEY.
     */
    private String apiKey;

    /**
     * Fallback aliases for older or custom property names.
     */
    private String key;

    private String modelName;

    /**
     * Example: gemini-1.5-flash or gemini-2.0-flash.
     */
    private String model = "gemini-1.5-flash";

    /**
     * Base endpoint without trailing slash.
     */
    private String apiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    private Double temperature = 0.7;

    private Integer topK = 32;

    private Double topP = 0.9;

    private Integer maxOutputTokens = 700;

    public String getResolvedApiKey() {
        for (String candidate : List.of(nullToEmpty(apiKey), nullToEmpty(key))) {
            if (!candidate.isBlank()) {
                return candidate.trim();
            }
        }

        for (String envName : List.of("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_AI_API_KEY")) {
            String envValue = System.getenv(envName);
            if (envValue != null && !envValue.isBlank()) {
                return envValue.trim();
            }
        }

        return "";
    }

    public String getResolvedModel() {
        if (model != null && !model.isBlank()) {
            return model.trim();
        }
        if (modelName != null && !modelName.isBlank()) {
            return modelName.trim();
        }
        return "gemini-1.5-flash";
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
