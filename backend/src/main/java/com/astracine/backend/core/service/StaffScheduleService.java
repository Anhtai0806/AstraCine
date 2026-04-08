package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.entity.SchedulePlan;
import com.astracine.backend.core.entity.ShiftTemplate;
import com.astracine.backend.core.entity.StaffingDemand;
import com.astracine.backend.core.entity.User;
import com.astracine.backend.core.enums.AssignmentSource;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.enums.SchedulePlanStatus;
import com.astracine.backend.core.repository.ScheduleAssignmentRepository;
import com.astracine.backend.core.repository.SchedulePlanRepository;
import com.astracine.backend.core.repository.ShiftTemplateRepository;
import com.astracine.backend.core.repository.StaffingDemandRepository;
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
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class StaffScheduleService {

    private final SchedulePlanRepository schedulePlanRepository;
    private final ScheduleAssignmentRepository scheduleAssignmentRepository;
    private final StaffingDemandRepository staffingDemandRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;
    private final UserRepository userRepository;

    public StaffScheduleDTO.PlanResponse generatePlan(LocalDate businessDate) {
        schedulePlanRepository.findFirstByBusinessDateAndStatusOrderByGeneratedAtDesc(businessDate, SchedulePlanStatus.DRAFT)
                .ifPresent(plan -> {
                    throw new RuntimeException("Ngày " + businessDate + " đã có draft plan. Hãy dùng draft hiện tại hoặc publish/archive trước khi tạo mới.");
                });

        List<StaffingDemand> demands = staffingDemandRepository.findByBusinessDateOrderByWindowStartAsc(businessDate);
        if (demands.isEmpty()) {
            throw new RuntimeException("Chưa có nhu cầu nhân sự theo ca cho ngày này");
        }

        SchedulePlan plan = new SchedulePlan();
        plan.setBusinessDate(businessDate);
        plan.setGeneratedBy(
                userRepository.findByUsername(getCurrentUsername())
                        .map(User::getId)
                        .orElse(null)
        );
        plan.setWindowMinutes((int) Duration.between(demands.get(0).getWindowStart(), demands.get(0).getWindowEnd()).toMinutes());
        plan.setStatus(SchedulePlanStatus.DRAFT);
        plan.setNote("Kế hoạch ca được sinh tự động từ nhu cầu vận hành theo ca");
        SchedulePlan savedPlan = schedulePlanRepository.save(plan);

        List<ShiftTemplate> templates = shiftTemplateRepository.findByActiveTrueOrderByStartTimeAsc();
        List<User> staffCandidates = userRepository.findActiveStaffCandidates()
                .stream()
                .filter(this::isEligibleForScheduling)
                .toList();

        if (staffCandidates.isEmpty()) {
            throw new RuntimeException("Không có nhân viên đủ điều kiện để xếp lịch. Hãy kiểm tra vị trí và thông tin cá nhân của staff.");
        }

        LocalDate weekStart = businessDate.minusDays(businessDate.getDayOfWeek().getValue() - 1L);
        LocalDate weekEnd = weekStart.plusDays(6);
        List<ScheduleAssignment> existingWeekAssignments = scheduleAssignmentRepository.findAllBetween(
                weekStart.atStartOfDay(),
                weekEnd.plusDays(1).atStartOfDay()
        );

        Map<Long, Long> weeklyMinutesMap = buildWeeklyMinutesMap(existingWeekAssignments);
        List<ScheduleAssignment> generatedAssignments = new ArrayList<>();

        for (ShiftTemplate template : templates) {
            List<StaffingDemand> overlappingDemands = demands.stream()
                    .filter(demand -> overlaps(template, demand))
                    .toList();

            if (overlappingDemands.isEmpty()) {
                continue;
            }

            int counterRequired = overlappingDemands.stream().mapToInt(StaffingDemand::getCounterRequired).max().orElse(0);
            int checkinRequired = overlappingDemands.stream().mapToInt(StaffingDemand::getCheckinRequired).max().orElse(0);
            int concessionRequired = overlappingDemands.stream().mapToInt(StaffingDemand::getConcessionRequired).max().orElse(0);
            int multiRequired = overlappingDemands.stream().mapToInt(StaffingDemand::getMultiRequired).max().orElse(0);

            boolean hasDemand = counterRequired + checkinRequired + concessionRequired + multiRequired > 0;

            int[] cappedDemand = capShiftDemand(
                    counterRequired,
                    checkinRequired,
                    concessionRequired,
                    multiRequired,
                    hasDemand
            );

            counterRequired = cappedDemand[0];
            checkinRequired = cappedDemand[1];
            concessionRequired = cappedDemand[2];
            multiRequired = cappedDemand[3];

            generatedAssignments.addAll(assignForPosition(savedPlan, template, businessDate, "COUNTER", counterRequired, staffCandidates, generatedAssignments, existingWeekAssignments, weeklyMinutesMap));
            generatedAssignments.addAll(assignForPosition(savedPlan, template, businessDate, "CHECKIN", checkinRequired, staffCandidates, generatedAssignments, existingWeekAssignments, weeklyMinutesMap));
            generatedAssignments.addAll(assignForPosition(savedPlan, template, businessDate, "CONCESSION", concessionRequired, staffCandidates, generatedAssignments, existingWeekAssignments, weeklyMinutesMap));
            generatedAssignments.addAll(assignForPosition(savedPlan, template, businessDate, "MULTI", multiRequired, staffCandidates, generatedAssignments, existingWeekAssignments, weeklyMinutesMap));
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

    private List<ScheduleAssignment> assignForPosition(
            SchedulePlan plan,
            ShiftTemplate template,
            LocalDate businessDate,
            String position,
            int requiredCount,
            List<User> staffCandidates,
            List<ScheduleAssignment> currentAssignments,
            List<ScheduleAssignment> existingAssignments,
            Map<Long, Long> weeklyMinutesMap
    ) {
        List<ScheduleAssignment> created = new ArrayList<>();
        if (requiredCount <= 0) {
            return created;
        }

        LocalDateTime shiftStart = resolveShiftStart(businessDate, template.getStartTime());
        LocalDateTime shiftEnd = resolveShiftEnd(businessDate, template.getStartTime(), template.getEndTime());
        long shiftMinutes = resolveWorkingMinutes(template, shiftStart, shiftEnd);

        for (int i = 0; i < requiredCount; i++) {
            User bestCandidate = staffCandidates.stream()
                    .filter(candidate -> canWorkPosition(candidate, position))
                    .filter(candidate -> !hasOverlap(candidate.getId(), shiftStart, shiftEnd, currentAssignments, existingAssignments))
                    .min(Comparator.comparingInt(candidate -> scoreCandidate(candidate, position, weeklyMinutesMap, template)))
                    .orElse(null);

            if (bestCandidate == null) {
                continue;
            }

            long currentWeeklyMinutes = weeklyMinutesMap.getOrDefault(bestCandidate.getId(), 0L);

            ScheduleAssignment assignment = new ScheduleAssignment();
            assignment.setPlan(plan);
            assignment.setStaff(bestCandidate);
            assignment.setShiftTemplate(template);
            assignment.setAssignedPosition(position);
            assignment.setShiftStart(shiftStart);
            assignment.setShiftEnd(shiftEnd);
            assignment.setSource(AssignmentSource.AUTO);
            assignment.setStatus(ScheduleAssignmentStatus.DRAFT);
            assignment.setExplanation(buildExplanation(bestCandidate, position, currentWeeklyMinutes, template));

            created.add(assignment);
            currentAssignments.add(assignment);
            weeklyMinutesMap.merge(bestCandidate.getId(), shiftMinutes, Long::sum);
        }

        return created;
    }

    private boolean overlaps(ShiftTemplate template, StaffingDemand demand) {
        LocalTime demandStart = demand.getWindowStart().toLocalTime();
        LocalTime demandEnd = demand.getWindowEnd().toLocalTime();

        if (!template.getEndTime().isAfter(template.getStartTime())) {
            LocalDateTime shiftStart = resolveShiftStart(demand.getBusinessDate(), template.getStartTime());
            LocalDateTime shiftEnd = resolveShiftEnd(demand.getBusinessDate(), template.getStartTime(), template.getEndTime());
            return demand.getWindowStart().isBefore(shiftEnd) && demand.getWindowEnd().isAfter(shiftStart);
        }

        return demandStart.isBefore(template.getEndTime()) && demandEnd.isAfter(template.getStartTime());
    }

    private boolean canWorkPosition(User candidate, String position) {
        String staffPosition = normalizePosition(candidate.getStaffPosition());
        return staffPosition.equals(position) || staffPosition.equals("MULTI");
    }

    private boolean hasOverlap(
            Long staffId,
            LocalDateTime shiftStart,
            LocalDateTime shiftEnd,
            List<ScheduleAssignment> currentAssignments,
            List<ScheduleAssignment> existingAssignments
    ) {
        return overlapsForStaff(staffId, shiftStart, shiftEnd, currentAssignments)
                || overlapsForStaff(staffId, shiftStart, shiftEnd, existingAssignments);
    }

    private boolean overlapsForStaff(
            Long staffId,
            LocalDateTime shiftStart,
            LocalDateTime shiftEnd,
            List<ScheduleAssignment> assignments
    ) {
        return assignments.stream()
                .filter(assignment -> assignment.getStaff() != null)
                .filter(assignment -> Objects.equals(assignment.getStaff().getId(), staffId))
                .anyMatch(assignment -> assignment.getShiftStart().isBefore(shiftEnd)
                        && assignment.getShiftEnd().isAfter(shiftStart));
    }

    private int scoreCandidate(
            User candidate,
            String position,
            Map<Long, Long> weeklyMinutesMap,
            ShiftTemplate template
    ) {
        int score = 0;
        String staffPosition = normalizePosition(candidate.getStaffPosition());

        if (staffPosition.equals(position)) {
            score -= 1000;
        } else if (staffPosition.equals("MULTI")) {
            score -= 700;
        }

        score += weeklyMinutesMap.getOrDefault(candidate.getId(), 0L).intValue();

        if ("EVENING".equalsIgnoreCase(template.getCode())) {
            score += 30;
        }

        return score;
    }

    private String buildExplanation(User staff, String position, long currentWeeklyMinutes, ShiftTemplate template) {
        String actualPosition = normalizePosition(staff.getStaffPosition());
        String matchReason = actualPosition.equals(position)
                ? "đúng vị trí chính"
                : "được dùng như nhân sự đa nhiệm MULTI để bù tải";

        return "Xếp " + resolveStaffName(staff)
                + " vào " + template.getName()
                + " vị trí " + position
                + " vì " + matchReason
                + ", không bị trùng ca và tổng giờ tuần hiện tại là "
                + currentWeeklyMinutes
                + " phút.";
    }

    private Map<Long, Long> buildWeeklyMinutesMap(List<ScheduleAssignment> assignments) {
        Map<Long, Long> weeklyMinutes = new HashMap<>();
        for (ScheduleAssignment assignment : assignments) {
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

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails userDetails)) {
            return null;
        }
        return userDetails.getUsername();
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
                assignmentCount
        );
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
                assignment.getExplanation()
        );
    }

    private String resolveStaffName(User staff) {
        if (staff.getFullName() != null && !staff.getFullName().isBlank()) {
            return staff.getFullName();
        }
        return staff.getUsername();
    }

    private String normalizePosition(String position) {
        if (position == null || position.isBlank()) {
            return "UNKNOWN";
        }
        return position.trim().toUpperCase();
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
                && hasText(user.getPhone())
                && user.getAttendanceDisciplineStatus() != com.astracine.backend.core.enums.AttendanceDisciplineStatus.SUSPENDED_FROM_AUTO_ASSIGNMENT
                && user.getAttendanceDisciplineStatus() != com.astracine.backend.core.enums.AttendanceDisciplineStatus.LOCKED_BY_ATTENDANCE_REVIEW;
    }

    private static final int MAX_STAFF_PER_SHIFT = 6;

    private int[] capShiftDemand(
            int counterRequired,
            int checkinRequired,
            int concessionRequired,
            int multiRequired,
            boolean hasDemand
    ) {
        int counter = Math.max(counterRequired, 0);
        int checkin = Math.max(checkinRequired, 0);
        int concession = Math.max(concessionRequired, 0);
        int multi = Math.max(multiRequired, 0);

        int total = counter + checkin + concession + multi;
        if (total <= MAX_STAFF_PER_SHIFT) {
            return new int[]{counter, checkin, concession, multi};
        }

        int minCounter = hasDemand ? 1 : 0;
        int minCheckin = hasDemand ? 1 : 0;
        int minConcession = hasDemand ? 1 : 0;
        int minMulti = 0;

        while (total > MAX_STAFF_PER_SHIFT) {
            if (multi > minMulti) {
                multi--;
            } else if (concession > minConcession) {
                concession--;
            } else if (checkin > minCheckin) {
                checkin--;
            } else if (counter > minCounter) {
                counter--;
            } else {
                break;
            }
            total = counter + checkin + concession + multi;
        }

        return new int[]{counter, checkin, concession, multi};
    }
}