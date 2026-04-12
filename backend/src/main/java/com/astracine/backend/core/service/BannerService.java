package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Banner;
import com.astracine.backend.core.repository.BannerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BannerService {

    private final BannerRepository bannerRepository;
    private final FileStorageService fileStorageService;

    /** Public: Chỉ lấy banner đang active, sắp xếp theo displayOrder */
    public List<Banner> getActiveBanners() {
        return bannerRepository.findAllByIsActiveTrueOrderByDisplayOrderAsc();
    }

    /** Admin: Lấy tất cả banner */
    public List<Banner> getAllBanners() {
        return bannerRepository.findAllByOrderByDisplayOrderAsc();
    }

    /** Admin: Tạo banner mới từ file upload */
    public Banner createBanner(MultipartFile image, String title, String linkUrl, Integer displayOrder) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ảnh banner.");
        }

        String imageUrl = fileStorageService.storeFile(image);
        log.info("[Banner] Uploaded image to Cloudinary: {}", imageUrl);

        Banner banner = Banner.builder()
                .imageUrl(imageUrl)
                .title(title != null ? title.trim() : "")
                .linkUrl(linkUrl != null ? linkUrl.trim() : null)
                .displayOrder(displayOrder != null ? displayOrder : 0)
                .isActive(true)
                .build();

        return bannerRepository.save(banner);
    }

    /** Admin: Cập nhật metadata (không đổi ảnh) */
    public Banner updateBanner(Long id, String title, String linkUrl, Integer displayOrder, Boolean isActive) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy banner với ID: " + id));

        if (title != null) banner.setTitle(title.trim());
        if (linkUrl != null) banner.setLinkUrl(linkUrl.isBlank() ? null : linkUrl.trim());
        if (displayOrder != null) banner.setDisplayOrder(displayOrder);
        if (isActive != null) banner.setIsActive(isActive);

        return bannerRepository.save(banner);
    }

    /** Admin: Xóa banner */
    public void deleteBanner(Long id) {
        if (!bannerRepository.existsById(id)) {
            throw new IllegalArgumentException("Không tìm thấy banner với ID: " + id);
        }
        bannerRepository.deleteById(id);
        log.info("[Banner] Deleted banner id={}", id);
    }
}
