import React from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import "./AdminLayout.css";
import { FaRegChartBar, FaPhotoVideo, FaFilm, FaBarcode } from "react-icons/fa";
import { FaHouse } from "react-icons/fa6";
import { MdAccessTime, MdOutlineManageAccounts } from "react-icons/md";
import { SlCalender } from "react-icons/sl";
import { useAuth } from "../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";
import { LuPopcorn } from "react-icons/lu";

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
                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaRegChartBar className="icon-admin-layout" /> Dashboard
                    </NavLink>

                    <NavLink
                        to="/admin/genres"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaPhotoVideo className="icon-admin-layout" /> Thể loại
                    </NavLink>

                    <NavLink
                        to="/admin/movies"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaFilm className="icon-admin-layout" /> Quản lý Phim
                    </NavLink>

                    <NavLink
                        to="/admin/rooms"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaHouse className="icon-admin-layout" /> Quản lý Phòng
                    </NavLink>

                    <NavLink
                        to="/admin/time-slots"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <MdAccessTime className="icon-admin-layout" /> Khung giờ
                    </NavLink>

                    <NavLink
                        to="/admin/promotions"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <FaBarcode className="icon-admin-layout" /> Mã Khuyến Mãi
                    </NavLink>

                    <NavLink
                        to="/admin/showtimes"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <SlCalender className="icon-admin-layout" /> Lịch Chiếu
                    </NavLink>

                    <NavLink
                        to="/admin/customer-management"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <MdOutlineManageAccounts className="icon-admin-layout" /> Quản lý Customer
                    </NavLink>

                    <NavLink
                        to="/admin/staff-management"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        👥 Quản lý Staff
                    </NavLink>

                    <NavLink
                        to="/admin/staff-scheduling"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        🗓️ Chia lịch Staff
                    </NavLink>

                    <NavLink
                        to="/admin/attendance"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        ⏱️ Attendance Staff
                    </NavLink>

                    <NavLink
                        to="/admin/payroll"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        💰 Payroll Staff
                    </NavLink>

                    <NavLink
                        to="/admin/combos"
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        <LuPopcorn className="icon-admin-layout" /> Bắp &amp; Nước
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