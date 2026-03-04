import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // 👈 Nhớ import Routes

import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/Admin/Dashboard';
import RoomManager from '../pages/Admin/RoomManager';
import TimeSlotManager from '../pages/Admin/TimeSlotManager';
import ShowtimeManager from '../pages/Admin/ShowtimeManager';
import AdminMovies from '../pages/Admin/AdminMovies';
import AdminGenres from '../pages/Admin/AdminGenres';
import AdminPromotions from '../pages/Admin/AdminPromotions';
import AdminUsers from '../pages/Admin/AdminUsers';
const AdminRoutes = () => {
    return (
        /* 👇 QUAN TRỌNG: Phải bọc trong <Routes> vì đây là một Component độc lập */
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
                <Route path="users" element={<AdminUsers />} />

            </Route>
        </Routes>
    );
};

export default AdminRoutes;