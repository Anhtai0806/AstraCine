import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './AdminLayout.css';


const AdminLayout = () => {
    return (
        <div className="portal-layout"> {/* Dùng class portal-layout để ăn CSS layout */}

            {/* --- SIDEBAR --- */}
            <aside className="sidebar">
                {/* Logo Brand */}
                <div className="brand">
                    Astra<span>Cine</span> Admin
                </div>

                {/* Menu Navigation */}
                <nav className="portal-nav">
                    {/* 1. Dashboard */}
                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        📊 Dashboard
                    </NavLink>

                    {/* 2. Thể loại (Từ AdminLayout cũ) */}
                    <NavLink
                        to="/admin/genres"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🎭 Thể loại
                    </NavLink>

                    {/* 3. Quản lý Phim (Từ AdminLayout cũ) */}
                    <NavLink
                        to="/admin/movies"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🎥 Quản lý Phim
                    </NavLink>


                    {/* 4. Quản lý Phòng (Từ PortalLayout) */}
                    <NavLink
                        to="/admin/rooms"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🛠 Quản lý Phòng
                    </NavLink>

                    {/* MỚI: Quản lý Khung giờ */}
                    <NavLink
                        to="/admin/time-slots"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🕒 Khung giờ
                    </NavLink>

                    {/* Quản lý Mã Khuyến Mãi */}
                    <NavLink
                        to="/admin/promotions"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🎟️ Mã Khuyến Mãi
                    </NavLink>

                    {/* 5. Lịch chiếu (Sắp làm) */}
                    <NavLink
                        to="/admin/showtimes"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🎬 Lịch Chiếu
                    </NavLink>


                    <NavLink
                        to="/admin/staff-management"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        👥 Quản lý Staff
                    </NavLink>

                    <NavLink
                        to="/admin/combos"
                        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    >
                        🍿 Bắp &amp; Nước
                    </NavLink>
                </nav>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="content">
                <Outlet /> {/* Nơi nội dung các trang con hiển thị */}
            </main>
        </div>
    );
};

export default AdminLayout;