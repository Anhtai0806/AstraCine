import React from 'react';
<<<<<<< HEAD
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import AdminGenres from '../pages/Admin/AdminGenres';
import AdminMovies from '../pages/Admin/AdminMovies';
import Dashboard from '../pages/Admin/Dashboard';
import RoomManager from '../pages/Admin/RoomManager';

const AdminRoutes = () => {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="genres" element={<AdminGenres />} />
                <Route path="movies" element={<AdminMovies />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="rooms" element={<RoomManager />} />
=======
import { Routes, Route, Navigate } from 'react-router-dom'; // 👈 Nhớ import Routes

import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import RoomManager from '../pages/admin/RoomManager';
import TimeSlotManager from '../pages/admin/TimeSlotManager';
import ShowtimeManager from '../pages/admin/ShowtimeManager';
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
                <Route path="time-slots" element={<TimeSlotManager />} />
                <Route path="showtimes" element={<ShowtimeManager />} />
             
>>>>>>> 9e86ed7ab229e096bde335ced0312381a6d208e9
            </Route>
        </Routes>
    );
};

export default AdminRoutes;