import React from 'react';
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
            </Route>
        </Routes>
    );
};

export default AdminRoutes;