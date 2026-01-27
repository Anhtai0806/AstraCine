import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./AdminLayout.css";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="nav-header">
          <h1>🎬 AstraCine Admin</h1>

          {/* 👤 Thông tin + Logout */}
          <div className="admin-user">
            <button onClick={handleLogout} className="logout-btn">
              Đăng xuất
            </button>
          </div>
        </div>

        <ul className="nav-menu">
          <li>
            <Link to="/admin/genres" className="nav-link">
              🎭 Genres
            </Link>
          </li>
          <li>
            <Link to="/admin/movies" className="nav-link">
              🎥 Movies
            </Link>
          </li>
        </ul>
      </nav>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
