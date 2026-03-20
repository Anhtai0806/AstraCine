package com.astracine.backend.core.service;

import com.astracine.backend.core.enums.MovieStatus;
import com.astracine.backend.core.repository.InvoiceRepository;
import com.astracine.backend.core.repository.MovieRepository;
import com.astracine.backend.core.repository.UserRepository;
import com.astracine.backend.presentation.dto.dashboard.AdminDashboardDTO;
import com.astracine.backend.presentation.dto.dashboard.RevenuePointDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final InvoiceRepository invoiceRepository;

    @Override
    public AdminDashboardDTO getDashboardStatistics(String chartType) {
        long totalCustomers = userRepository.countUsersByRoleName("ROLE_CUSTOMER");
        long totalMoviesShowing = movieRepository.countByStatus(MovieStatus.NOW_SHOWING);
        BigDecimal totalRevenue = invoiceRepository.sumTotalRevenueByStatus("PAID");

        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        List<Object[]> revenueData;
        if ("month".equalsIgnoreCase(chartType)) {
            LocalDateTime startDate = LocalDateTime.now().minusMonths(6).withDayOfMonth(1);
            revenueData = invoiceRepository.findRevenueByMonthRange("PAID", startDate);
        } else {
            LocalDateTime startDate = LocalDateTime.now().minusDays(7);
            revenueData = invoiceRepository.findRevenueByDateRange("PAID", startDate);
        }
        List<RevenuePointDTO> revenueChart = new ArrayList<>();

        for (Object[] row : revenueData) {
            String dateStr = String.valueOf(row[0]);
            BigDecimal amount = row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            revenueChart.add(new RevenuePointDTO(dateStr, amount));
        }

        return AdminDashboardDTO.builder()
                .totalCustomers(totalCustomers)
                .totalMoviesShowing(totalMoviesShowing)
                .totalRevenue(totalRevenue)
                .revenueChart(revenueChart)
                .build();
    }
}
