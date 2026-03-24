package com.astracine.backend.presentation.dto.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Payload webhook mà PayOS gửi đến /api/payments/payos/webhook
 * Ref: https://payos.vn/docs/webhook/
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayOSWebhookPayload {

    private String code;
    private String desc;
    private boolean success;
    private WebhookData data;
    private String signature;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class WebhookData {
        private long orderCode;
        private long amount;
        private String description;
        private String reference;
        private String transactionDateTime;
        private String paymentLinkId;
        private String code;
        private String desc;
        private String counterAccountBankId;
        private String counterAccountBankName;
        private String counterAccountName;
        private String counterAccountNumber;
        private String virtualAccountName;
        private String virtualAccountNumber;
        private String currency;
    }
}
