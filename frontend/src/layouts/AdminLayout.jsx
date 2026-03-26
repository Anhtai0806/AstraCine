import React from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import "./AdminLayout.css";
import { FaRegChartBar } from "react-icons/fa";
import { FaPhotoVideo } from "react-icons/fa";
import { FaFilm } from "react-icons/fa";
import { FaHouse } from "react-icons/fa6";
import { MdAccessTime } from "react-icons/md";
import { FaBarcode } from "react-icons/fa";
import { SlCalender } from "react-icons/sl";
import { GrUserManager } from "react-icons/gr";
import { useAuth } from "../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";

const AdminLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
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
            <FaRegChartBar className="icon-admin-layout" /> Dashboard
          </NavLink>

          {/* 2. Thể loại (Từ AdminLayout cũ) */}
          <NavLink
            to="/admin/genres"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaPhotoVideo className="icon-admin-layout" /> Thể loại
          </NavLink>

          {/* 3. Quản lý Phim (Từ AdminLayout cũ) */}
          <NavLink
            to="/admin/movies"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaFilm className="icon-admin-layout" /> Quản lý Phim
          </NavLink>

          {/* 4. Quản lý Phòng (Từ PortalLayout) */}
          <NavLink
            to="/admin/rooms"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaHouse className="icon-admin-layout" /> Quản lý Phòng
          </NavLink>

          {/* MỚI: Quản lý Khung giờ */}
          <NavLink
            to="/admin/time-slots"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <MdAccessTime className="icon-admin-layout" /> Khung giờ
          </NavLink>

          {/* Quản lý Mã Khuyến Mãi */}
          <NavLink
            to="/admin/promotions"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <FaBarcode className="icon-admin-layout" /> Mã Khuyến Mãi
          </NavLink>

          {/* 5. Lịch chiếu (Sắp làm) */}
          <NavLink
            to="/admin/showtimes"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <SlCalender className="icon-admin-layout" /> Lịch Chiếu
          </NavLink>

          <NavLink
            to="/admin/staff-management"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <GrUserManager className="icon-admin-layout" /> Quản lý Staff
          </NavLink>

          <NavLink
            to="/admin/combos"
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          >
            🍿 Bắp &amp; Nước
          </NavLink>
        </nav>
        <div className="logout-section">
          <button className="logout-btn" onClick={handleLogout}>
            <IoIosLogOut className="icon-admin-layout" /> Đăng xuất
          </button>
        </div>
      </aside>
      {/* --- MAIN CONTENT --- */}
      <main className="content">
        <Outlet /> {/* Nơi nội dung các trang con hiển thị */}
      </main>
    </div>
  );
};

export default AdminLayout;
