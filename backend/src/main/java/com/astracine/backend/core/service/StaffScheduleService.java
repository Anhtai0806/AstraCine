package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.HolidayPeriod;
import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.entity.SchedulePlan;
import com.astracine.backend.core.entity.ShiftTemplate;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.enums.AssignmentSource;
import com.astracine.backend.core.enums.EmploymentType;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.enums.SchedulePlanStatus;
import com.astracine.backend.core.repository.HolidayPeriodRepository;
import com.astracine.backend.core.repository.ScheduleAssignmentRepository;
import com.astracine.backend.core.repository.SchedulePlanRepository;
import com.astracine.backend.core.repository.ShiftTemplateRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.staffschedule.StaffScheduleDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffScheduleService {

    private static final int DEFAULT_REQUIRED_STAFF_PER_SHIFT = 5;

    private final SchedulePlanRepository schedulePlanRepository;
    private final ScheduleAssignmentRepository scheduleAssignmentRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;
    private final UserRepository userRepository;
    private final HolidayPeriodRepository holidayPeriodRepository;

    public StaffScheduleDTO.PlanResponse generatePlan(LocalDate businessDate) {
        return generateSimplePlan(businessDate, DEFAULT_REQUIRED_STAFF_PER_SHIFT);
    }

    public StaffScheduleDTO.PlanResponse generateSimplePlan(LocalDate businessDate, Integer requiredStaffPerShift) {
        validateRequiredStaff(requiredStaffPerShift);

        schedulePlanRepository.findFirstByBusinessDateAndStatusOrderByGeneratedAtDesc(businessDate, SchedulePlanStatus.DRAFT)
                .ifPresent(plan -> {
                    throw new RuntimeException("Ngày " + businessDate + " đã có draft plan. Hãy dùng draft hiện tại hoặc publish/archive trước khi tạo mới.");
                });

        List<ShiftTemplate> templates = shiftTemplateRepository.findByActiveTrueOrderByStartTimeAsc();
        if (templates.isEmpty()) {
            throw new RuntimeException("Chưa có shift template active để tạo lịch.");
        }

        List<User> staffCandidates = userRepository.findEligibleStaffForDate(businessDate)
                .stream()
                .filter(this::isEligibleForScheduling)
                .toList();

        if (staffCandidates.isEmpty()) {
            throw new RuntimeException("Không có nhân viên đủ điều kiện để xếp lịch. Hãy kiểm tra vị trí, loại nhân sự và hồ sơ staff.");
        }

        List<HolidayPeriod> holidayPeriods = holidayPeriodRepository.findActiveByBusinessDate(businessDate);
        HolidayPeriod activeHoliday = holidayPeriods.isEmpty() ? null : holidayPeriods.get(0);
        boolean holidayMode = activeHoliday != null;

        SchedulePlan plan = new SchedulePlan();
        plan.setBusinessDate(businessDate);
        plan.setGeneratedBy(
                userRepository.findByUsername(getCurrentUsername())
                        .map(User::getId)
                        .orElse(null)
        );
        plan.setWindowMinutes(30);
        plan.setStatus(SchedulePlanStatus.DRAFT);
        plan.setNote(holidayMode
                ? "Simple shift plan - holiday mode, ép 1-2 part-time mỗi ca"
                : "Simple shift plan - ưu tiên full-time, part-time bù thiếu");
        SchedulePlan savedPlan = schedulePlanRepository.save(plan);

        LocalDate weekStart = businessDate.minusDays(businessDate.getDayOfWeek().getValue() - 1L);
        LocalDate weekEnd = weekStart.plusDays(6);
        List<ScheduleAssignment> existingWeekAssignments = scheduleAssignmentRepository.findAllBetween(
                weekStart.atStartOfDay(),
                weekEnd.plusDays(1).atStartOfDay());

        Map<Long, Long> weeklyMinutesMap = buildWeeklyMinutesMap(existingWeekAssignments);
        List<ScheduleAssignment> generatedAssignments = new ArrayList<>();

        for (ShiftTemplate template : templates) {
            LocalDateTime shiftStart = resolveShiftStart(businessDate, template.getStartTime());
            LocalDateTime shiftEnd = resolveShiftEnd(businessDate, template.getStartTime(), template.getEndTime());
            long shiftMinutes = resolveWorkingMinutes(template, shiftStart, shiftEnd);

            List<User> eligibleForShift = staffCandidates.stream()
                    .filter(candidate -> !hasOverlap(candidate.getId(), shiftStart, shiftEnd, generatedAssignments, existingWeekAssignments))
                    .toList();

            List<User> partTimePool = eligibleForShift.stream()
                    .filter(user -> user.getEmploymentType() == EmploymentType.PART_TIME)
                    .toList();

            List<User> fullTimePool = eligibleForShift.stream()
                    .filter(user -> user.getEmploymentType() != EmploymentType.PART_TIME)
                    .toList();

            int minPartTime = holidayMode ? safeHolidayCount(activeHoliday.getMinPartTimePerShift(), 1) : 0;
            int maxPartTime = holidayMode ? safeHolidayCount(activeHoliday.getMaxPartTimePerShift(), 2) : 0;
            int targetPartTime = holidayMode
                    ? resolvePartTimeTarget(requiredStaffPerShift, minPartTime, maxPartTime, partTimePool.size())
                    : Math.min(partTimePool.size(), Math.max(0, requiredStaffPerShift - fullTimePool.size()));

            List<User> selected = new ArrayList<>();
            selected.addAll(pickBalanced(partTimePool, targetPartTime, weeklyMinutesMap));
            selected.addAll(pickBalanced(fullTimePool, requiredStaffPerShift - selected.size(), weeklyMinutesMap));

            if (selected.size() < requiredStaffPerShift) {
                List<User> fallbackPool = eligibleForShift.stream()
                        .filter(user -> !selected.contains(user))
                        .toList();
                selected.addAll(pickBalanced(fallbackPool, requiredStaffPerShift - selected.size(), weeklyMinutesMap));
            }

            for (User staff : selected) {
                long currentWeeklyMinutes = weeklyMinutesMap.getOrDefault(staff.getId(), 0L);

                ScheduleAssignment assignment = new ScheduleAssignment();
                assignment.setPlan(savedPlan);
                assignment.setStaff(staff);
                assignment.setShiftTemplate(template);
                assignment.setAssignedPosition(normalizePosition(staff.getStaffPosition()));
                assignment.setShiftStart(shiftStart);
                assignment.setShiftEnd(shiftEnd);
                assignment.setSource(AssignmentSource.AUTO);
                assignment.setStatus(ScheduleAssignmentStatus.DRAFT);
                assignment.setExplanation(buildExplanation(staff, template, currentWeeklyMinutes, activeHoliday));
                generatedAssignments.add(assignment);
                weeklyMinutesMap.merge(staff.getId(), shiftMinutes, Long::sum);
            }
        }

        List<ScheduleAssignment> savedAssignments = scheduleAssignmentRepository.saveAll(generatedAssignments);
        return mapPlan(savedPlan, savedAssignments.size());
    }

    @Transactional(readOnly = true)
    public List<StaffScheduleDTO.PlanResponse> getPlans(LocalDate businessDate) {
        return schedulePlanRepository.findByBusinessDateOrderByGeneratedAtDesc(businessDate)
                .stream()
                .map(plan -> mapPlan(plan, scheduleAssignmentRepository.findByPlan_IdOrderByShiftStartAscAssignedPositionAsc(plan.getId()).size()))
                .toList();
    }

    public StaffScheduleDTO.PlanResponse publishPlan(Long planId) {
        SchedulePlan plan = schedulePlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy schedule plan"));

        if (plan.getStatus() == SchedulePlanStatus.ARCHIVED) {
            throw new RuntimeException("Không thể publish một plan đã archived");
        }

        schedulePlanRepository.findByBusinessDateOrderByGeneratedAtDesc(plan.getBusinessDate())
                .stream()
                .filter(existingPlan -> !Objects.equals(existingPlan.getId(), planId))
                .filter(existingPlan -> existingPlan.getStatus() == SchedulePlanStatus.PUBLISHED)
                .forEach(existingPlan -> existingPlan.setStatus(SchedulePlanStatus.ARCHIVED));

        plan.setStatus(SchedulePlanStatus.PUBLISHED);
        List<ScheduleAssignment> assignments = scheduleAssignmentRepository.findByPlan_IdOrderByShiftStartAscAssignedPositionAsc(planId);
        assignments.forEach(assignment -> {
            if (assignment.getStatus() == ScheduleAssignmentStatus.DRAFT) {
                assignment.setStatus(ScheduleAssignmentStatus.PUBLISHED);
            }
        });
        scheduleAssignmentRepository.saveAll(assignments);
        return mapPlan(schedulePlanRepository.save(plan), assignments.size());
    }

    @Transactional(readOnly = true)
    public List<StaffScheduleDTO.AssignmentResponse> getAssignmentsByDate(LocalDate businessDate) {
        return scheduleAssignmentRepository.findByBusinessDate(businessDate)
                .stream()
                .map(this::mapAssignment)
                .toList();
    }

    @Transactional(readOnly = true)
    public StaffScheduleDTO.AssignmentExplanationResponse getExplanation(Long assignmentId) {
        ScheduleAssignment assignment = scheduleAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy assignment"));
        return new StaffScheduleDTO.AssignmentExplanationResponse(assignment.getId(), assignment.getExplanation());
    }

    @Transactional(readOnly = true)
    public StaffScheduleDTO.MyScheduleResponse getMySchedule(LocalDate fromDate, LocalDate toDate) {
        String username = getCurrentUsername();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));

        List<StaffScheduleDTO.AssignmentResponse> assignments = scheduleAssignmentRepository.findForStaffBetween(
                        currentUser.getId(),
                        fromDate.atStartOfDay(),
                        toDate.plusDays(1).atStartOfDay())
                .stream()
                .map(this::mapAssignment)
                .toList();
        return new StaffScheduleDTO.MyScheduleResponse(fromDate, toDate, assignments);
    }

    public StaffScheduleDTO.AssignmentResponse confirmAssignment(Long assignmentId) {
        ScheduleAssignment assignment = scheduleAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy assignment"));
        String username = getCurrentUsername();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user"));
        if (!Objects.equals(assignment.getStaff().getId(), currentUser.getId())) {
            throw new RuntimeException("Bạn không thể xác nhận ca của người khác");
        }
        if (assignment.getStatus() != ScheduleAssignmentStatus.PUBLISHED) {
            throw new RuntimeException("Chỉ có thể xác nhận assignment đang ở trạng thái PUBLISHED");
        }
        assignment.setStatus(ScheduleAssignmentStatus.CONFIRMED);
        return mapAssignment(scheduleAssignmentRepository.save(assignment));
    }

    private List<User> pickBalanced(List<User> pool, int limit, Map<Long, Long> weeklyMinutesMap) {
        if (limit <= 0 || pool.isEmpty()) {
            return new ArrayList<>();
        }
        return pool.stream()
                .sorted(Comparator
                        .comparingLong((User user) -> weeklyMinutesMap.getOrDefault(user.getId(), 0L))
                        .thenComparing(this::resolveStaffName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(User::getUsername, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .limit(limit)
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private int resolvePartTimeTarget(int requiredStaff, int minPartTime, int maxPartTime, int availablePartTime) {
        if (requiredStaff <= 0 || availablePartTime <= 0) {
            return 0;
        }
        int safeMin = Math.max(0, minPartTime);
        int safeMax = Math.max(safeMin, maxPartTime);
        int desired = Math.min(Math.min(safeMax, availablePartTime), requiredStaff);
        if (desired < safeMin) {
            return availablePartTime >= safeMin ? safeMin : Math.min(availablePartTime, requiredStaff);
        }
        return desired;
    }

    private Map<Long, Long> buildWeeklyMinutesMap(List<ScheduleAssignment> assignments) {
        Map<Long, Long> weeklyMinutes = new HashMap<>();
        for (ScheduleAssignment assignment : assignments) {
            if (assignment.getStaff() == null) {
                continue;
            }
            ShiftTemplate template = assignment.getShiftTemplate();
            long minutes = resolveWorkingMinutes(template, assignment.getShiftStart(), assignment.getShiftEnd());
            weeklyMinutes.merge(assignment.getStaff().getId(), minutes, Long::sum);
        }
        return weeklyMinutes;
    }

    private long resolveWorkingMinutes(ShiftTemplate template, LocalDateTime shiftStart, LocalDateTime shiftEnd) {
        long totalMinutes = Duration.between(shiftStart, shiftEnd).toMinutes();
        int breakMinutes = template != null && template.getBreakMinutes() != null ? template.getBreakMinutes() : 0;
        return Math.max(totalMinutes - breakMinutes, 0L);
    }

    private String buildExplanation(User staff, ShiftTemplate template, long currentWeeklyMinutes, HolidayPeriod holiday) {
        String employment = staff.getEmploymentType() == null ? EmploymentType.FULL_TIME.name() : staff.getEmploymentType().name();
        String holidayText = holiday == null ? "Ngày thường" : "Holiday mode: " + holiday.getName();
        return "Xếp " + resolveStaffName(staff)
                + " vào ca " + (template.getName() != null ? template.getName() : template.getCode())
                + " với vị trí " + normalizePosition(staff.getStaffPosition())
                + ". Loại nhân sự: " + employment
                + ". " + holidayText
                + ". Tổng phút tuần trước khi xếp: " + currentWeeklyMinutes + " phút.";
    }

    private LocalDateTime resolveShiftStart(LocalDate businessDate, LocalTime startTime) {
        return businessDate.atTime(startTime);
    }

    private LocalDateTime resolveShiftEnd(LocalDate businessDate, LocalTime startTime, LocalTime endTime) {
        LocalDateTime endDateTime = businessDate.atTime(endTime);
        if (!endTime.isAfter(startTime)) {
            endDateTime = endDateTime.plusDays(1);
        }
        return endDateTime;
    }

    private boolean hasOverlap(Long staffId,
                               LocalDateTime shiftStart,
                               LocalDateTime shiftEnd,
                               List<ScheduleAssignment> currentAssignments,
                               List<ScheduleAssignment> existingAssignments) {
        return overlapsForStaff(staffId, shiftStart, shiftEnd, currentAssignments)
                || overlapsForStaff(staffId, shiftStart, shiftEnd, existingAssignments);
    }

    private boolean overlapsForStaff(Long staffId,
                                     LocalDateTime shiftStart,
                                     LocalDateTime shiftEnd,
                                     List<ScheduleAssignment> assignments) {
        return assignments.stream()
                .filter(assignment -> assignment.getStaff() != null)
                .filter(assignment -> Objects.equals(assignment.getStaff().getId(), staffId))
                .anyMatch(assignment -> assignment.getShiftStart().isBefore(shiftEnd)
                        && assignment.getShiftEnd().isAfter(shiftStart));
    }

    private void validateRequiredStaff(Integer requiredStaffPerShift) {
        if (requiredStaffPerShift == null || requiredStaffPerShift < 4 || requiredStaffPerShift > 6) {
            throw new RuntimeException("Số nhân viên mỗi ca phải nằm trong khoảng 4-6 người.");
        }
    }

    private int safeHolidayCount(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean isEligibleForScheduling(User user) {
        return user != null
                && Boolean.TRUE.equals(user.getEnabled())
                && user.getStatus() != null
                && "ACTIVE".equalsIgnoreCase(String.valueOf(user.getStatus()))
                && user.getStaffPosition() != null
                && hasText(user.getFullName())
                && hasText(user.getEmail())
                && hasText(user.getPhone());
    }

    private StaffScheduleDTO.PlanResponse mapPlan(SchedulePlan plan, int assignmentCount) {
        return new StaffScheduleDTO.PlanResponse(
                plan.getId(),
                plan.getBusinessDate(),
                plan.getStatus(),
                plan.getWindowMinutes(),
                plan.getGeneratedBy(),
                plan.getGeneratedAt(),
                plan.getNote(),
                assignmentCount);
    }

    private StaffScheduleDTO.AssignmentResponse mapAssignment(ScheduleAssignment assignment) {
        ShiftTemplate template = assignment.getShiftTemplate();
        return new StaffScheduleDTO.AssignmentResponse(
                assignment.getId(),
                assignment.getPlan().getId(),
                assignment.getStaff().getId(),
                resolveStaffName(assignment.getStaff()),
                assignment.getStaff().getUsername(),
                assignment.getAssignedPosition(),
                template == null ? null : template.getCode(),
                template == null ? null : template.getName(),
                assignment.getShiftStart(),
                assignment.getShiftEnd(),
                assignment.getStatus(),
                assignment.getExplanation());
    }

    private String resolveStaffName(User staff) {
        if (staff.getFullName() != null && !staff.getFullName().isBlank()) {
            return staff.getFullName();
        }
        return staff.getUsername();
    }

    private String normalizePosition(String value) {
        if (value == null || value.isBlank()) {
            return "MULTI";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            return null;
        }
        return userDetails.getUsername();
    }
}
