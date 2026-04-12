package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.entity.Banner;
import com.astracine.backend.core.service.BannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    // ─── PUBLIC ───────────────────────────────────────────────────────────────

    /** Trang chủ lấy danh sách banner đang active */
    @GetMapping("/api/banners")
    public ResponseEntity<List<Banner>> getActiveBanners() {
        return ResponseEntity.ok(bannerService.getActiveBanners());
    }

    // ─── ADMIN ────────────────────────────────────────────────────────────────

    /** Admin: lấy tất cả banner */
    @GetMapping("/api/admin/banners")
    public ResponseEntity<List<Banner>> getAllBanners() {
        return ResponseEntity.ok(bannerService.getAllBanners());
    }

    /** Admin: upload banner mới */
    @PostMapping(value = "/api/admin/banners", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Banner> createBanner(
            @RequestParam(name = "image") MultipartFile image,
            @RequestParam(name = "title", required = false) String title,
            @RequestParam(name = "linkUrl", required = false) String linkUrl,
            @RequestParam(name = "displayOrder", required = false) Integer displayOrder) {
        return ResponseEntity.ok(bannerService.createBanner(image, title, linkUrl, displayOrder));
    }

    /** Admin: cập nhật metadata banner */
    @PutMapping("/api/admin/banners/{id}")
    public ResponseEntity<Banner> updateBanner(
            @PathVariable("id") Long id,
            @RequestParam(name = "title", required = false) String title,
            @RequestParam(name = "linkUrl", required = false) String linkUrl,
            @RequestParam(name = "displayOrder", required = false) Integer displayOrder,
            @RequestParam(name = "isActive", required = false) Boolean isActive) {
        return ResponseEntity.ok(bannerService.updateBanner(id, title, linkUrl, displayOrder, isActive));
    }

    /** Admin: xóa banner */
    @DeleteMapping("/api/admin/banners/{id}")
    public ResponseEntity<Map<String, String>> deleteBanner(@PathVariable("id") Long id) {
        bannerService.deleteBanner(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa banner id=" + id));
    }
}
