package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Attendance;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.repository.AttendanceRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.staff.PayrollDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PayrollService {

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("22000");
    private static final Map<String, BigDecimal> HOURLY_RATES = Map.of(
            "COUNTER", new BigDecimal("24000"),
            "CHECKIN", new BigDecimal("22000"),
            "CONCESSION", new BigDecimal("23000"),
            "MULTI", new BigDecimal("26000")
    );

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    public PayrollDTO.PayrollSummaryResponse getPayrollSummary(LocalDate fromDate, LocalDate toDate) {
        validateRange(fromDate, toDate);

        List<Attendance> attendances = attendanceRepository.findPayrollAttendanceBetween(fromDate, toDate);

        Map<Long, StaffAccumulator> byStaff = new LinkedHashMap<>();
        for (Attendance attendance : attendances) {
            User staff = attendance.getStaff();
            StaffAccumulator acc = byStaff.computeIfAbsent(staff.getId(), id -> new StaffAccumulator(staff));
            acc.consume(attendance, resolvePayrollMinutes(attendance), resolveRate(attendance.getAssignment().getAssignedPosition()));
        }

        List<PayrollDTO.PayrollStaffSummaryItem> items = byStaff.values().stream()
                .map(StaffAccumulator::toSummaryItem)
                .sorted(Comparator.comparing(PayrollDTO.PayrollStaffSummaryItem::getGrossAmount).reversed()
                        .thenComparing(PayrollDTO.PayrollStaffSummaryItem::getStaffUsername, String.CASE_INSENSITIVE_ORDER))
                .toList();

        int totalMinutes = items.stream().mapToInt(PayrollDTO.PayrollStaffSummaryItem::getTotalMinutes).sum();
        BigDecimal totalGross = items.stream()
                .map(PayrollDTO.PayrollStaffSummaryItem::getGrossAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new PayrollDTO.PayrollSummaryResponse(
                fromDate,
                toDate,
                attendances.size(),
                totalMinutes,
                minutesToHours(totalMinutes),
                totalGross,
                buildRates(),
                items
        );
    }

    public PayrollDTO.PayrollStaffDetailResponse getPayrollForStaff(Long staffId, LocalDate fromDate, LocalDate toDate) {
        validateRange(fromDate, toDate);
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên"));

        List<Attendance> attendances = attendanceRepository.findPayrollAttendanceBetween(fromDate, toDate)
                .stream()
                .filter(attendance -> attendance.getStaff() != null && staffId.equals(attendance.getStaff().getId()))
                .toList();

        return buildDetailResponse(staff, fromDate, toDate, attendances);
    }

    public PayrollDTO.PayrollStaffDetailResponse getMyPayroll(LocalDate fromDate, LocalDate toDate) {
        validateRange(fromDate, toDate);
        User currentUser = userRepository.findByUsername(getCurrentUsername())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        List<Attendance> attendances = attendanceRepository.findPayrollAttendanceBetween(fromDate, toDate)
                .stream()
                .filter(attendance -> attendance.getStaff() != null && currentUser.getId().equals(attendance.getStaff().getId()))
                .toList();

        return buildDetailResponse(currentUser, fromDate, toDate, attendances);
    }

    private PayrollDTO.PayrollStaffDetailResponse buildDetailResponse(User staff,
                                                                      LocalDate fromDate,
                                                                      LocalDate toDate,
                                                                      List<Attendance> attendances) {
        List<PayrollDTO.PayrollAssignmentLineResponse> lines = new ArrayList<>();
        int totalMinutes = 0;
        BigDecimal grossAmount = BigDecimal.ZERO;

        for (Attendance attendance : attendances) {
            int workingMinutes = resolvePayrollMinutes(attendance);
            BigDecimal hourlyRate = resolveRate(attendance.getAssignment().getAssignedPosition());
            BigDecimal amount = calculateAmount(workingMinutes, hourlyRate);

            lines.add(new PayrollDTO.PayrollAssignmentLineResponse(
                    attendance.getAssignment().getId(),
                    attendance.getBusinessDate(),
                    attendance.getAssignment().getAssignedPosition(),
                    attendance.getAssignment().getShiftTemplate() != null ? attendance.getAssignment().getShiftTemplate().getCode() : null,
                    attendance.getAssignment().getShiftTemplate() != null ? attendance.getAssignment().getShiftTemplate().getName() : null,
                    attendance.getAssignment().getShiftStart(),
                    attendance.getAssignment().getShiftEnd(),
                    attendance.getAssignment().getStatus(),
                    workingMinutes,
                    hourlyRate,
                    amount
            ));

            totalMinutes += workingMinutes;
            grossAmount = grossAmount.add(amount);
        }

        lines.sort(Comparator.comparing(PayrollDTO.PayrollAssignmentLineResponse::getShiftStart));

        return new PayrollDTO.PayrollStaffDetailResponse(
                fromDate,
                toDate,
                staff.getId(),
                resolveStaffName(staff),
                staff.getUsername(),
                normalizePosition(staff.getStaffPosition()),
                lines.size(),
                totalMinutes,
                minutesToHours(totalMinutes),
                grossAmount,
                buildRates(),
                lines,
                "Lương hiện được tính theo attendance thực tế. Ca vắng được tính 0 phút."
        );
    }

    private List<PayrollDTO.PayrollRateResponse> buildRates() {
        return HOURLY_RATES.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new PayrollDTO.PayrollRateResponse(
                        entry.getKey(),
                        entry.getValue(),
                        entry.getValue().divide(new BigDecimal("60"), 2, RoundingMode.HALF_UP)
                ))
                .toList();
    }

    private int resolvePayrollMinutes(Attendance attendance) {
        if (attendance == null || attendance.getStatus() == null) {
            return 0;
        }
        return switch (attendance.getStatus()) {
            case COMPLETED, ADJUSTED, MISSED_CHECKOUT, CHECKED_IN -> attendance.getWorkedMinutes() == null ? 0 : attendance.getWorkedMinutes();
            case ABSENT, PENDING -> 0;
        };
    }

    private BigDecimal calculateAmount(int workingMinutes, BigDecimal hourlyRate) {
        return hourlyRate
                .multiply(BigDecimal.valueOf(workingMinutes))
                .divide(BigDecimal.valueOf(60), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal resolveRate(String position) {
        String normalized = normalizePosition(position);
        return HOURLY_RATES.getOrDefault(normalized, DEFAULT_RATE);
    }

    private BigDecimal minutesToHours(int totalMinutes) {
        return BigDecimal.valueOf(totalMinutes)
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    private String normalizePosition(String value) {
        if (value == null || value.isBlank()) {
            return "UNASSIGNED";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String resolveStaffName(User staff) {
        if (staff.getFullName() != null && !staff.getFullName().isBlank()) {
            return staff.getFullName();
        }
        return staff.getUsername();
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Chưa đăng nhập");
        }
        return authentication.getName();
    }

    private void validateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null || toDate == null) {
            throw new RuntimeException("fromDate và toDate là bắt buộc");
        }
        if (toDate.isBefore(fromDate)) {
            throw new RuntimeException("toDate không được nhỏ hơn fromDate");
        }
        if (Duration.between(fromDate.atStartOfDay(), toDate.plusDays(1).atStartOfDay()).toDays() > 93) {
            throw new RuntimeException("Khoảng thời gian xem lương không nên vượt quá 93 ngày");
        }
    }

    private static class StaffAccumulator {
        private final User staff;
        private int assignmentCount;
        private int totalMinutes;
        private BigDecimal grossAmount = BigDecimal.ZERO;

        private StaffAccumulator(User staff) {
            this.staff = staff;
        }

        private void consume(Attendance attendance, int workingMinutes, BigDecimal hourlyRate) {
            this.assignmentCount++;
            this.totalMinutes += workingMinutes;
            this.grossAmount = this.grossAmount.add(
                    hourlyRate.multiply(BigDecimal.valueOf(workingMinutes))
                            .divide(BigDecimal.valueOf(60), 0, RoundingMode.HALF_UP)
            );
        }

        private PayrollDTO.PayrollStaffSummaryItem toSummaryItem() {
            return new PayrollDTO.PayrollStaffSummaryItem(
                    staff.getId(),
                    staff.getFullName() != null && !staff.getFullName().isBlank() ? staff.getFullName() : staff.getUsername(),
                    staff.getUsername(),
                    staff.getStaffPosition(),
                    assignmentCount,
                    totalMinutes,
                    BigDecimal.valueOf(totalMinutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP),
                    grossAmount
            );
        }
    }
}
