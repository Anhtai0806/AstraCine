import React from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import "./AdminLayout.css";
import {
    FaRegChartBar,
    FaPhotoVideo,
    FaFilm,
    FaBarcode,
    FaUsers,
    FaMoneyBillWave,
    FaImages,
    FaTags,
    FaFileInvoiceDollar

} from "react-icons/fa";
import { FaHouse } from "react-icons/fa6";
import { MdAccessTime, MdOutlineManageAccounts, MdEventNote } from "react-icons/md";
import { SlCalender } from "react-icons/sl";
import { useAuth } from "../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";
import { LuPopcorn } from "react-icons/lu";
import { BiTimeFive } from "react-icons/bi";

const AdminLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="portal-layout">
            <aside className="sidebar">
                <div className="brand">
                    Astra<span>Cine</span> Admin
                </div>

                <nav className="portal-nav">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaRegChartBar className="icon-admin-layout" /> Dashboard
                    </NavLink>

                    <NavLink to="/admin/genres" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaPhotoVideo className="icon-admin-layout" /> Thể loại
                    </NavLink>

                    <NavLink to="/admin/movies" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaFilm className="icon-admin-layout" /> Quản lý Phim
                    </NavLink>

                    <NavLink
                        to="/admin/seat-prices"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaTags className="icon-admin-layout" /> Quản lý Giá Ghế
                    </NavLink>

                    <NavLink
                        to="/admin/rooms"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaHouse className="icon-admin-layout" /> Quản lý Phòng
                    </NavLink>

                    <NavLink to="/admin/time-slots" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <MdAccessTime className="icon-admin-layout" /> Khung giờ
                    </NavLink>

                    <NavLink to="/admin/promotions" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaBarcode className="icon-admin-layout" /> Mã Khuyến Mãi
                    </NavLink>

                    <NavLink to="/admin/combos" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <LuPopcorn className="icon-admin-layout" /> Bắp &amp; Nước
                    </NavLink>

                    <NavLink to="/admin/showtimes" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <SlCalender className="icon-admin-layout" /> Lịch Chiếu
                    </NavLink>

                    <NavLink to="/admin/customer-management" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <MdOutlineManageAccounts className="icon-admin-layout" /> Quản lý Customer
                    </NavLink>

                    <NavLink to="/admin/staff-management" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaUsers className="icon-admin-layout" /> Quản lý Nhân viên
                    </NavLink>

                    <NavLink to="/admin/staff-scheduling" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <MdEventNote className="icon-admin-layout" /> Phân ca Nhân viên
                    </NavLink>

                    <NavLink to="/admin/attendance" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <BiTimeFive className="icon-admin-layout" /> Chấm công Nhân viên
                    </NavLink>

                    <NavLink to="/admin/payroll" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaMoneyBillWave className="icon-admin-layout" /> Bảng lương Nhân viên
                    </NavLink>

                    <NavLink to="/admin/invoices" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaFileInvoiceDollar className="icon-admin-layout" /> Hóa Đơn
                    </NavLink>

                    <NavLink to="/admin/banners" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        <FaImages className="icon-admin-layout" /> Quản lý Banner
                    </NavLink>
                </nav>

                <div className="logout-section">
                    <button className="logout-btn" onClick={handleLogout}>
                        <IoIosLogOut className="icon-admin-layout" /> Đăng xuất
                    </button>
                </div>
            </aside>

            <main className="content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;