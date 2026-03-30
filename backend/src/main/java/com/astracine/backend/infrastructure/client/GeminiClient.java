package com.astracine.backend.infrastructure.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.astracine.backend.infrastructure.config.GeminiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final GeminiProperties geminiProperties;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public GeminiResult generateReply(String systemInstruction, List<String> userMessages) {
        String apiKey = geminiProperties.getResolvedApiKey();
        String model = geminiProperties.getResolvedModel();
        if (apiKey.isBlank()) {
            return GeminiResult.failure(
                    "Gemini API key chua duoc cau hinh. Hay dat gemini.api-key, gemini.key hoac bien moi truong GEMINI_API_KEY.");
        }

        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.set("system_instruction", buildSystemInstruction(systemInstruction));
            payload.set("contents", buildContents(userMessages));

            ObjectNode generationConfig = payload.putObject("generationConfig");
            generationConfig.put("temperature", geminiProperties.getTemperature());
            generationConfig.put("topK", geminiProperties.getTopK());
            generationConfig.put("topP", geminiProperties.getTopP());
            generationConfig.put("maxOutputTokens", geminiProperties.getMaxOutputTokens());

            String endpoint = geminiProperties.getApiBaseUrl() + "/" + model
                    + ":generateContent?key=" + apiKey;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("Gemini API error {} body={}", response.statusCode(), response.body());
                return GeminiResult.failure("Gemini API tra ve loi HTTP " + response.statusCode() + ".");
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            if (!parts.isArray() || parts.isEmpty()) {
                return GeminiResult.failure("Gemini khong tra ve noi dung hop le.");
            }

            StringBuilder answer = new StringBuilder();
            for (JsonNode part : parts) {
                String text = part.path("text").asText("");
                if (!text.isBlank()) {
                    if (answer.length() > 0) {
                        answer.append("\n");
                    }
                    answer.append(text.trim());
                }
            }

            if (answer.length() == 0) {
                return GeminiResult.failure("Gemini khong tra ve noi dung hop le.");
            }

            return GeminiResult.success(answer.toString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Gemini API interrupted", ex);
            return GeminiResult.failure("Khong the goi Gemini API: " + ex.getMessage());
        } catch (IOException ex) {
            log.error("Gemini API IO error", ex);
            return GeminiResult.failure("Khong the goi Gemini API: " + ex.getMessage());
        }
    }

    private ObjectNode buildSystemInstruction(String systemInstruction) {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode parts = root.putArray("parts");
        parts.addObject().put("text", systemInstruction);
        return root;
    }

    private ArrayNode buildContents(List<String> userMessages) {
        ArrayNode contents = objectMapper.createArrayNode();
        for (String message : userMessages) {
            if (message == null || message.isBlank()) {
                continue;
            }
            ObjectNode content = contents.addObject();
            content.put("role", "user");
            ArrayNode parts = content.putArray("parts");
            parts.addObject().put("text", message.trim());
        }
        return contents;
    }

    public record GeminiResult(boolean success, String text, String errorMessage) {
        public static GeminiResult success(String text) {
            return new GeminiResult(true, text, null);
        }

        public static GeminiResult failure(String errorMessage) {
            return new GeminiResult(false, null, errorMessage);
        }
    }
}
