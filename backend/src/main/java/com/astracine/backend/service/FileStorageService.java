package com.astracine.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.folder:astracine/posters}")
    private String folder;

    /**
     * Upload file to Cloudinary and return the secure URL
     */
    public String storeFile(MultipartFile file) {
        try {
            // Generate unique public ID
            String publicId = folder + "/" + UUID.randomUUID().toString();

            // Upload to Cloudinary
            Map<String, Object> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "resource_type", "image",
                            "folder", folder));

            // Return secure URL
            return (String) uploadResult.get("secure_url");

        } catch (IOException ex) {
            throw new RuntimeException("Could not upload file to Cloudinary. Please try again!", ex);
        }
    }

    /**
     * Delete file from Cloudinary using the image URL
     */
    public void deleteFile(String imageUrl) {
        try {
            if (imageUrl != null && !imageUrl.isEmpty()) {
                // Extract public ID from Cloudinary URL
                String publicId = extractPublicIdFromUrl(imageUrl);
                if (publicId != null) {
                    cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                }
            }
        } catch (IOException ex) {
            // Log the error but don't throw exception
            System.err.println("Could not delete file from Cloudinary: " + imageUrl);
        }
    }

    /**
     * Validate if the uploaded file is a valid image
     */
    public boolean isValidImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return false;
        }

        String contentType = file.getContentType();
        return contentType != null && (contentType.equals("image/jpeg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/jpg") ||
                contentType.equals("image/webp"));
    }

    /**
     * Extract public ID from Cloudinary URL
     * Example:
     * https://res.cloudinary.com/demo/image/upload/v1234567890/astracine/posters/abc-123.jpg
     * Returns: astracine/posters/abc-123
     */
    private String extractPublicIdFromUrl(String url) {
        try {
            if (url.contains("/upload/")) {
                String[] parts = url.split("/upload/");
                if (parts.length > 1) {
                    String pathWithVersion = parts[1];
                    // Remove version (v1234567890/)
                    String path = pathWithVersion.replaceFirst("v\\d+/", "");
                    // Remove file extension
                    int lastDot = path.lastIndexOf('.');
                    if (lastDot > 0) {
                        return path.substring(0, lastDot);
                    }
                    return path;
                }
            }
        } catch (Exception e) {
            System.err.println("Error extracting public ID from URL: " + url);
        }
        return null;
    }
}
