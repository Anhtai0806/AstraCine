import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";
import "./Header.css";

function TopBar() {
  const { user, logout } = useAuth();

  return (
    <div className="topbar">
      <div className="topbar-container">
        <div className="topbar-right">
          {user ? (
            <>
              <span>Xin chào, {user.fullName || user.username}</span>
              <span>|</span>
              <button className="logout-btn" onClick={logout}>
                Đăng xuất <IoIosLogOut className="logout-icon" />
              </button>
            </>
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
