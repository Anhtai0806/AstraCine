import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import "./AdminLayout.css";

const AdminLayout = () => {
  return (
    <div className="portal-layout">
      {" "}
      {/* Dùng class portal-layout để ăn CSS layout */}
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
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            📊 Dashboard
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            👤 Tài Khoản
          </NavLink>

          {/* 2. Quản lý Phim (Từ AdminLayout cũ) */}
          <NavLink
            to="/admin/movies"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🎥 Quản lý Phim
          </NavLink>

          {/* 3. Thể loại (Từ AdminLayout cũ) */}
          <NavLink
            to="/admin/genres"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🎭 Thể loại
          </NavLink>

          {/* 4. Quản lý Phòng (Từ PortalLayout) */}
          <NavLink
            to="/admin/rooms"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🛠 Quản lý Phòng
          </NavLink>

          {/* MỚI: Quản lý Khung giờ */}
          <NavLink
            to="/admin/time-slots"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🕒 Khung giờ
          </NavLink>

          {/* Quản lý Mã Khuyến Mãi */}
          <NavLink
            to="/admin/promotions"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🎟️ Mã Khuyến Mãi
          </NavLink>

          {/* 5. Lịch chiếu (Sắp làm) */}
          <NavLink
            to="/admin/showtimes"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            🎬 Lịch Chiếu
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
