import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // 👈 Nhớ import Routes

import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import RoomManager from '../pages/admin/RoomManager';
import TimeSlotManager from '../pages/admin/TimeSlotManager';
import ShowtimeManager from '../pages/admin/ShowtimeManager';
import AdminMovies from '../pages/Admin/AdminMovies';
import AdminGenres from '../pages/Admin/AdminGenres';
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
                <Route path="time-slots" element={<TimeSlotManager />} />
                <Route path="showtimes" element={<ShowtimeManager />} />

            </Route>
        </Routes>
    );
};

export default AdminRoutes;