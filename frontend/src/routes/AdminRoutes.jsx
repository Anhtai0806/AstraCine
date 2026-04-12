import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/Admin/Dashboard';
import RoomManager from '../pages/Admin/RoomManager';
import TimeSlotManager from '../pages/Admin/TimeSlotManager';
import ShowtimeManager from '../pages/Admin/ShowtimeManager';
import AdminMovies from '../pages/Admin/AdminMovies';
import AdminGenres from '../pages/Admin/AdminGenres';
import AdminPromotions from '../pages/Admin/AdminPromotions';
import AdminStaffManagement from '../pages/Admin/AdminStaffManagement';
import AdminStaffScheduling from '../pages/Admin/AdminStaffScheduling';
import AdminAttendance from '../pages/Admin/AdminAttendance';
import AdminPayroll from '../pages/Admin/AdminPayroll';
import CustomerManagement from '../pages/Admin/CustomerManagement';
import AdminCombo from '../pages/Admin/Combo';
import AdminInvoices from '../pages/Admin/AdminInvoices';
import AdminBanner from '../pages/Admin/AdminBanner';

const AdminRoutes = () => {
    const { user } = useAuth();

    // Kiểm tra authentication và role
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!user.roles?.includes("ROLE_ADMIN")) {
        return <Navigate to="/" replace />;
    }

    return (
        <Routes>
            <Route element={<AdminLayout />}>
                {/* Mặc định vào /admin -> nhảy sang dashboard */}
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* Các trang con */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="rooms" element={<RoomManager />} />
                <Route path="movies" element={<AdminMovies />} />
                <Route path="genres" element={<AdminGenres />} />
                <Route path="promotions" element={<AdminPromotions />} />
                <Route path="time-slots" element={<TimeSlotManager />} />
                <Route path="showtimes" element={<ShowtimeManager />} />
                <Route path="staff-management" element={<AdminStaffManagement />} />
                <Route path="staff-scheduling" element={<AdminStaffScheduling />} />
                <Route path="attendance" element={<AdminAttendance />} />
                <Route path="payroll" element={<AdminPayroll />} />
                <Route path="customer-management" element={<CustomerManagement />} />
                <Route path="combos" element={<AdminCombo />} />
                <Route path="invoices" element={<AdminInvoices />} />
                <Route path="banners" element={<AdminBanner />} />
            </Route>
        </Routes>
    );
};

export default AdminRoutes;
