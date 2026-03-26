package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Combo;
import com.astracine.backend.core.repository.ComboRepository;
import com.astracine.backend.presentation.dto.ComboDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.stream.Collectors;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComboService {
    private final ComboRepository comboRepository;

    // Lấy danh sách tất cả (của Admin)
    public List<Combo> getAllCombos() {
        return comboRepository.findAll();
    }

    // Lấy danh sách combo đang bán (Cho nhân viên bán hàng)
    public List<Combo> getActiveCombos() {
        return comboRepository.findByStatus("ACTIVE");
    }

    // Lấy chi tiết 1 combo
    public Combo getComboById(Long id) {
        return comboRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Combo với ID: " + id));
    }

    // Tạo mới
    public Combo createCombo(ComboDTO dto) {
        Combo combo = new Combo();
        combo.setName(dto.getName());
        combo.setPrice(dto.getPrice());
        combo.setStatus(dto.getStatus());
        combo.setStockQuantity(dto.getStockQuantity() != null ? dto.getStockQuantity() : 0);
        return comboRepository.save(combo);
    }

    // Cập nhật
    public Combo updateCombo(Long id, ComboDTO dto) {
        Combo existingCombo = getComboById(id);
        existingCombo.setName(dto.getName());
        existingCombo.setPrice(dto.getPrice());
        // Chỉ cập nhật status nếu user có gửi lên, nếu không giữ nguyên
        if (dto.getStatus() != null && !dto.getStatus().isEmpty()) {
            existingCombo.setStatus(dto.getStatus());
        }
        if (dto.getStockQuantity() != null) {
            existingCombo.setStockQuantity(dto.getStockQuantity());
        }
        return comboRepository.save(existingCombo);
    }

    // 6. Xóa (Soft Delete)
    // Nếu xóa cứng (deleteById) sẽ lỗi nếu combo này đã từng được bán trong Invoice
    // cũ.
    public void deleteCombo(Long id) {
        Combo existingCombo = getComboById(id);
        existingCombo.setStatus("INACTIVE");
        comboRepository.save(existingCombo);
    }

    public List<Combo> searchAndFilterCombos(String keyword, String status, Double minPrice, Double maxPrice) {
        List<Combo> allCombos = comboRepository.findAll();

        return allCombos.stream()
                .filter(c -> {
                    if (keyword != null && !keyword.trim().isEmpty()) {
                        if (!c.getName().toLowerCase().contains(keyword.trim().toLowerCase())) {
                            return false;
                        }
                    }

                    if (status != null && !status.trim().isEmpty()) {
                        if (!c.getStatus().equalsIgnoreCase(status.trim())) {
                            return false;
                        }
                    }

                    if (minPrice != null) {
                        BigDecimal min = BigDecimal.valueOf(minPrice);
                        if (c.getPrice().compareTo(min) < 0) {
                            return false;
                        }
                    }

                    if (maxPrice != null) {
                        BigDecimal max = BigDecimal.valueOf(maxPrice);
                        if (c.getPrice().compareTo(max) > 0) {
                            return false;
                        }
                    }

                    return true;
                })
                .collect(Collectors.toList());
    }
}
