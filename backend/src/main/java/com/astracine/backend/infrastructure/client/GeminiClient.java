package com.astracine.backend.infrastructure.client;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
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
        if (apiKey.isBlank()) {
            return GeminiResult.failure(
                    "Gemini API key chưa được cấu hình. Hãy đặt gemini.api-key, gemini.key hoặc biến môi trường GEMINI_API_KEY.");
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

            String payloadJson = objectMapper.writeValueAsString(payload);
            List<String> modelCandidates = geminiProperties.getResolvedModelCandidates();
            List<String> attemptedModels = new ArrayList<>();
            GeminiResult lastFailure = null;

            for (String model : modelCandidates) {
                attemptedModels.add(model);
                GeminiResult result = invokeModel(apiKey, model, payloadJson);
                if (result.success()) {
                    return result;
                }
                lastFailure = result;
                if (!result.retryable()) {
                    break;
                }
            }

            if (lastFailure == null) {
                return GeminiResult.failure("Không thể gọi Gemini API do chưa có model hợp lệ.");
            }
            if (attemptedModels.size() > 1) {
                return GeminiResult.failure(lastFailure.errorMessage()
                        + " Đã thử lần lượt các model: " + String.join(", ", attemptedModels) + ".");
            }
            return lastFailure;

        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Gemini API interrupted", ex);
            return GeminiResult.failure("Không thể gọi Gemini API: " + ex.getMessage());
        } catch (IOException ex) {
            log.error("Gemini API IO error", ex);
            return GeminiResult.failure("Không thể gọi Gemini API: " + ex.getMessage());
        }
    }

    private GeminiResult invokeModel(String apiKey, String model, String payloadJson) throws IOException, InterruptedException {
        String endpoint = geminiProperties.getApiBaseUrl() + "/" + model + ":generateContent?key=" + apiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payloadJson))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            return handleErrorResponse(model, response);
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
        if (!parts.isArray() || parts.isEmpty()) {
            return GeminiResult.failure("Gemini không trả về nội dung hợp lệ.");
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
            return GeminiResult.failure("Gemini không trả về nội dung hợp lệ.");
        }

        return GeminiResult.success(answer.toString());
    }

    private GeminiResult handleErrorResponse(String model, HttpResponse<String> response) {
        String body = response.body();
        int statusCode = response.statusCode();
        String retryDelay = extractRetryDelay(body);
        String status = extractErrorStatus(body);

        if (statusCode == 429) {
            log.warn("Gemini model {} hit quota/rate limit: status={} retryDelay={} body={}",
                    model, status, retryDelay, body);
            String message = "Gemini model " + model + " đang vượt quota hoặc rate limit";
            if (!retryDelay.isBlank()) {
                message += ", có thể thử lại sau " + retryDelay;
            }
            message += ".";
            return GeminiResult.retryableFailure(message);
        }

        if (statusCode >= 500) {
            log.warn("Gemini model {} server error {} body={}", model, statusCode, body);
            return GeminiResult.retryableFailure("Gemini model " + model + " tạm thời không khả dụng (HTTP " + statusCode + ").");
        }

        log.warn("Gemini API error on model {} status={} body={}", model, statusCode, body);
        return GeminiResult.failure("Gemini API trả về lỗi HTTP " + statusCode + " cho model " + model + ".");
    }

    private String extractRetryDelay(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            for (JsonNode detail : root.path("error").path("details")) {
                String type = detail.path("@type").asText("");
                if (type.contains("RetryInfo")) {
                    return detail.path("retryDelay").asText("");
                }
            }
        } catch (IOException ex) {
            log.debug("Cannot parse Gemini retry delay", ex);
        }
        return "";
    }

    private String extractErrorStatus(String body) {
        try {
            return objectMapper.readTree(body).path("error").path("status").asText("");
        } catch (IOException ex) {
            log.debug("Cannot parse Gemini error status", ex);
            return "";
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

    public record GeminiResult(boolean success, String text, String errorMessage, boolean retryable) {
        public static GeminiResult success(String text) {
            return new GeminiResult(true, text, null, false);
        }

        public static GeminiResult failure(String errorMessage) {
            return new GeminiResult(false, null, errorMessage, false);
        }

        public static GeminiResult retryableFailure(String errorMessage) {
            return new GeminiResult(false, null, errorMessage, true);
        }
    }
}
