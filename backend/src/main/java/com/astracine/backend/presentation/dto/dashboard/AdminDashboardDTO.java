package com.astracine.backend.presentation.dto.dashboard;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class AdminDashboardDTO {
    private long totalCustomers;
    private long totalMoviesShowing;
    private BigDecimal totalRevenue;
    private List<RevenuePointDTO> revenueChart;
}
