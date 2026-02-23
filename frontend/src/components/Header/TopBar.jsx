import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import "./Header.css";

function TopBar() {
  const { user, logout } = useAuth();

  return (
    <div className="topbar">
      <div className="topbar-container">
        <div className="topbar-right">
          {user ? (
            <div className="user-dropdown">
              <button className="user-btn">
                <FaUserCircle className="user-icon" />
                {user.fullName || user.username}
              </button>

              <div className="dropdown-menu">
                <Link to="/profile" className="logout-btn">
                  Tài khoản của tôi
                </Link>

                <button className="logout-btn" onClick={logout}>
                  Đăng xuất <IoIosLogOut className="logout-icon" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login">Đăng nhập</Link>
              <span>|</span>
              <Link to="/register">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopBar;
