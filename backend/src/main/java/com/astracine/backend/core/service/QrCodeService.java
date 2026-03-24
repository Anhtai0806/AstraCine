package com.astracine.backend.core.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.util.Base64;

@Service
public class QrCodeService {
    public String generateQrCodeBase64(String text) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            // Tạo ảnh QR kích thước 250x250
            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, 250, 250);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            // Đổi ảnh thành chuỗi Text (Base64) để gửi qua API
            String base64Image = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            return "data:image/png;base64," + base64Image;
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo QR Code", e);
        }
    }
}
