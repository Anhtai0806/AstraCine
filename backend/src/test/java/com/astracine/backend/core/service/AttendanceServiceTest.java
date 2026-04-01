package com.astracine.backend.core.service;

import com.astracine.backend.core.entity.Attendance;
import com.astracine.backend.core.entity.ScheduleAssignment;
import com.astracine.backend.core.entity.SchedulePlan;
import com.astracine.backend.core.entity.ShiftTemplate;
import com.astracine.backend.core.enums.AttendanceStatus;
import com.astracine.backend.core.enums.ScheduleAssignmentStatus;
import com.astracine.backend.core.enums.SchedulePlanStatus;
import com.astracine.backend.core.repository.AttendanceRepository;
import com.astracine.backend.core.repository.ScheduleAssignmentRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.attendance.AttendanceDTO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private ScheduleAssignmentRepository scheduleAssignmentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AttendanceService attendanceService;

    private com.astracine.backend.core.entity.User currentStaff;

    @BeforeEach
    void setUp() {
        currentStaff = new com.astracine.backend.core.entity.User();
        currentStaff.setId(7L);
        currentStaff.setUsername("staff01");
        currentStaff.setFullName("Nguyen Van A");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        org.springframework.security.core.userdetails.User
                                .withUsername("staff01")
                                .password("x")
                                .roles("STAFF")
                                .build(),
                        null,
                        List.of()
                )
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void checkIn_shouldCreatePendingAttendanceAndSaveCheckedIn() {
        when(userRepository.findByUsername("staff01")).thenReturn(Optional.of(currentStaff));
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleAssignment assignment = buildAssignment(
                101L,
                currentStaff,
                LocalDateTime.now().minusMinutes(5),
                LocalDateTime.now().plusHours(4),
                ScheduleAssignmentStatus.PUBLISHED,
                30
        );

        when(scheduleAssignmentRepository.findDetailedById(101L)).thenReturn(Optional.of(assignment));
        when(attendanceRepository.findWithAssignmentByAssignmentId(101L)).thenReturn(Optional.empty());

        AttendanceDTO.AttendanceItemResponse response = attendanceService.checkIn(101L);

        assertEquals(AttendanceStatus.CHECKED_IN, response.getAttendanceStatus());
        assertEquals(101L, response.getAssignmentId());
        assertFalse(Boolean.TRUE.equals(response.getCanCheckIn()));
        assertNotNull(response.getCheckInTime());

        ArgumentCaptor<Attendance> captor = ArgumentCaptor.forClass(Attendance.class);
        verify(attendanceRepository).save(captor.capture());
        Attendance saved = captor.getValue();

        assertEquals(AttendanceStatus.CHECKED_IN, saved.getStatus());
        assertEquals(currentStaff.getId(), saved.getStaff().getId());
        assertEquals(assignment.getPlan().getBusinessDate(), saved.getBusinessDate());
        assertNotNull(saved.getCheckInTime());
    }

    @Test
    void checkIn_shouldRejectDraftAssignment() {
        when(userRepository.findByUsername("staff01")).thenReturn(Optional.of(currentStaff));

        ScheduleAssignment assignment = buildAssignment(
                102L,
                currentStaff,
                LocalDateTime.now().minusMinutes(5),
                LocalDateTime.now().plusHours(4),
                ScheduleAssignmentStatus.DRAFT,
                0
        );

        when(scheduleAssignmentRepository.findDetailedById(102L)).thenReturn(Optional.of(assignment));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> attendanceService.checkIn(102L));
        assertTrue(ex.getMessage().contains("publish") || ex.getMessage().contains("confirm"));
    }

    @Test
    void checkOut_shouldCalculateWorkedMinutesMinusBreak() {
        when(userRepository.findByUsername("staff01")).thenReturn(Optional.of(currentStaff));
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime shiftStart = LocalDateTime.now().minusHours(3).withSecond(0).withNano(0);
        LocalDateTime shiftEnd = shiftStart.plusHours(8);

        ScheduleAssignment assignment = buildAssignment(
                103L,
                currentStaff,
                shiftStart,
                shiftEnd,
                ScheduleAssignmentStatus.PUBLISHED,
                30
        );

        Attendance attendance = new Attendance();
        attendance.setId(500L);
        attendance.setAssignment(assignment);
        attendance.setStaff(currentStaff);
        attendance.setBusinessDate(assignment.getPlan().getBusinessDate());
        attendance.setScheduledStart(shiftStart);
        attendance.setScheduledEnd(shiftEnd);
        attendance.setCheckInTime(shiftStart.plusMinutes(15));
        attendance.setStatus(AttendanceStatus.CHECKED_IN);

        when(scheduleAssignmentRepository.findDetailedById(103L)).thenReturn(Optional.of(assignment));
        when(attendanceRepository.findWithAssignmentByAssignmentId(103L)).thenReturn(Optional.of(attendance));

        AttendanceDTO.AttendanceItemResponse response = attendanceService.checkOut(103L);

        assertEquals(AttendanceStatus.COMPLETED, response.getAttendanceStatus());
        assertNotNull(response.getCheckOutTime());
        assertTrue(response.getWorkedMinutes() >= 134 && response.getWorkedMinutes() <= 136);

        Integer earlyLeave = response.getEarlyLeaveMinutes();
        assertNotNull(earlyLeave);
        assertTrue(earlyLeave >= 299 && earlyLeave <= 300);
    }

    @Test
    void markAbsent_shouldZeroOutAttendanceAndSetStatusAbsent() {
        when(userRepository.findByUsername("staff01")).thenReturn(Optional.of(currentStaff));
        when(attendanceRepository.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScheduleAssignment assignment = buildAssignment(
                104L,
                currentStaff,
                LocalDateTime.now().minusHours(1),
                LocalDateTime.now().plusHours(3),
                ScheduleAssignmentStatus.PUBLISHED,
                0
        );

        Attendance existing = new Attendance();
        existing.setAssignment(assignment);
        existing.setStaff(currentStaff);
        existing.setBusinessDate(assignment.getPlan().getBusinessDate());
        existing.setScheduledStart(assignment.getShiftStart());
        existing.setScheduledEnd(assignment.getShiftEnd());
        existing.setCheckInTime(LocalDateTime.now().minusMinutes(45));
        existing.setCheckOutTime(LocalDateTime.now().minusMinutes(5));
        existing.setWorkedMinutes(40);
        existing.setStatus(AttendanceStatus.COMPLETED);

        when(scheduleAssignmentRepository.findDetailedById(104L)).thenReturn(Optional.of(assignment));
        when(attendanceRepository.findWithAssignmentByAssignmentId(104L)).thenReturn(Optional.of(existing));

        AttendanceDTO.MarkAbsentRequest request = new AttendanceDTO.MarkAbsentRequest("Staff xin nghỉ");
        AttendanceDTO.AttendanceItemResponse response = attendanceService.markAbsent(104L, request);

        assertEquals(AttendanceStatus.ABSENT, response.getAttendanceStatus());
        assertEquals(0, response.getWorkedMinutes());
        assertNull(response.getCheckInTime());
        assertNull(response.getCheckOutTime());
        assertEquals("Staff xin nghỉ", response.getNote());
    }

    @Test
    void getAttendanceByDate_shouldCountStatusesCorrectly() {
        LocalDate businessDate = LocalDate.now();

        com.astracine.backend.core.entity.User staffA = new com.astracine.backend.core.entity.User();
        staffA.setId(11L);
        staffA.setUsername("a");
        staffA.setFullName("A Staff");

        com.astracine.backend.core.entity.User staffB = new com.astracine.backend.core.entity.User();
        staffB.setId(12L);
        staffB.setUsername("b");
        staffB.setFullName("B Staff");

        ScheduleAssignment a1 = buildAssignment(
                201L, staffA,
                businessDate.atTime(8, 0),
                businessDate.atTime(12, 0),
                ScheduleAssignmentStatus.PUBLISHED,
                0
        );
        ScheduleAssignment a2 = buildAssignment(
                202L, staffB,
                businessDate.atTime(9, 0),
                businessDate.atTime(13, 0),
                ScheduleAssignmentStatus.PUBLISHED,
                0
        );
        ScheduleAssignment a3 = buildAssignment(
                203L, currentStaff,
                businessDate.atTime(10, 0),
                businessDate.atTime(14, 0),
                ScheduleAssignmentStatus.PUBLISHED,
                0
        );

        Attendance checkedIn = new Attendance();
        checkedIn.setId(1L);
        checkedIn.setAssignment(a1);
        checkedIn.setStaff(staffA);
        checkedIn.setBusinessDate(businessDate);
        checkedIn.setStatus(AttendanceStatus.CHECKED_IN);

        Attendance completed = new Attendance();
        completed.setId(2L);
        completed.setAssignment(a2);
        completed.setStaff(staffB);
        completed.setBusinessDate(businessDate);
        completed.setStatus(AttendanceStatus.COMPLETED);

        when(scheduleAssignmentRepository.findByBusinessDateDetailed(businessDate))
                .thenReturn(List.of(a1, a2, a3));
        when(attendanceRepository.findDetailedBetweenDates(businessDate, businessDate))
                .thenReturn(List.of(checkedIn, completed));

        AttendanceDTO.AdminAttendanceDayResponse response = attendanceService.getAttendanceByDate(businessDate);

        assertEquals(3, response.getTotalAssignments());
        assertEquals(1, response.getCheckedInCount());
        assertEquals(1, response.getCompletedCount());
        assertEquals(0, response.getAbsentCount());
        assertEquals(1, response.getPendingCount());
        assertEquals(3, response.getItems().size());
    }

    private ScheduleAssignment buildAssignment(Long id,
                                               com.astracine.backend.core.entity.User staff,
                                               LocalDateTime shiftStart,
                                               LocalDateTime shiftEnd,
                                               ScheduleAssignmentStatus status,
                                               int breakMinutes) {
        SchedulePlan plan = new SchedulePlan();
        plan.setId(900L + id);
        plan.setBusinessDate(shiftStart.toLocalDate());
        plan.setStatus(SchedulePlanStatus.PUBLISHED);
        plan.setWindowMinutes(30);

        ShiftTemplate template = new ShiftTemplate();
        template.setId(300L + id);
        template.setCode("MORN");
        template.setName("Morning");
        template.setStartTime(LocalTime.of(8, 0));
        template.setEndTime(LocalTime.of(16, 0));
        template.setBreakMinutes(breakMinutes);
        template.setActive(true);

        ScheduleAssignment assignment = new ScheduleAssignment();
        assignment.setId(id);
        assignment.setPlan(plan);
        assignment.setStaff(staff);
        assignment.setShiftTemplate(template);
        assignment.setAssignedPosition("COUNTER");
        assignment.setShiftStart(shiftStart);
        assignment.setShiftEnd(shiftEnd);
        assignment.setStatus(status);
        return assignment;
    }
}