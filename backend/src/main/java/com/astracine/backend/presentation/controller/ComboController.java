package com.astracine.backend.presentation.controller;

import com.astracine.backend.core.entity.Combo;
import com.astracine.backend.core.service.ComboService;
import com.astracine.backend.presentation.dto.ComboDTO;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/combos")
@RequiredArgsConstructor
public class ComboController {

    private final ComboService comboService;

    // GET: Lấy tất cả (kể cả đã ẩn)
    @GetMapping
    public ResponseEntity<List<Combo>> getAll() {
        return ResponseEntity.ok(comboService.getAllCombos());
    }

    // GET: Chỉ lấy những combo đang bán (ACTIVE)
    @GetMapping("/active")
    public ResponseEntity<List<Combo>> getActive() {
        return ResponseEntity.ok(comboService.getActiveCombos());
    }

    // GET: Lấy chi tiết theo ID
    @GetMapping("/{id}")
    public ResponseEntity<Combo> getById(@PathVariable Long id) {
        return ResponseEntity.ok(comboService.getComboById(id));
    }

    // POST: Tạo mới
    @PostMapping
    public ResponseEntity<Combo> create(@Valid @RequestBody ComboDTO dto) {
        return ResponseEntity.ok(comboService.createCombo(dto));
    }

    // PUT: Cập nhật
    @PutMapping("/{id}")
    public ResponseEntity<Combo> update(@PathVariable Long id, @Valid @RequestBody ComboDTO dto) {
        return ResponseEntity.ok(comboService.updateCombo(id, dto));
    }

    // DELETE: Xóa mềm (Chuyển sang INACTIVE)
    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        comboService.deleteCombo(id);
        return ResponseEntity.ok("Đã ngừng kinh doanh Combo có ID: " + id);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Combo>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice) {
        return ResponseEntity.ok(comboService.searchAndFilterCombos(keyword, status, minPrice, maxPrice));
    }
}