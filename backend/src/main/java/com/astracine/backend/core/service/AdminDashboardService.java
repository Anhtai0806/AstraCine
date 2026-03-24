package com.astracine.backend.core.service;

import com.astracine.backend.presentation.dto.dashboard.AdminDashboardDTO;

public interface AdminDashboardService {
    AdminDashboardDTO getDashboardStatistics(String chartType);
}
