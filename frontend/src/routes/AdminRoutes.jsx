import React from 'react';
import { Route, Navigate } from 'react-router-dom';

// 1. Import Layout Mới (đã gộp)
import AdminLayout from '../layouts/AdminLayout';

// 2. Import Các Page (Cũ & Mới)
import Dashboard from '../pages/admin/Dashboard';
import RoomManager from '../pages/admin/RoomManager';
 // Giả sử bạn có trang này

const AdminRoutes = () => {
    return (
        /* ✅ Base Path là "/admin"
           Tất cả trang con sẽ dùng chung AdminLayout (có Sidebar đẹp)
        */
        <Route path="/admin" element={<AdminLayout />}>
            
            {/* Mặc định vào /admin sẽ nhảy sang Dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* --- NHÓM QUẢN LÝ RẠP (Từ Portal cũ) --- */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="rooms" element={<RoomManager />} />
            
          
            
            {/* --- NHÓM LỊCH CHIẾU (Sắp làm) --- */}
            {/* <Route path="showtimes" element={<ShowtimeManager />} /> */}

        </Route>
    );
};

export default AdminRoutes;