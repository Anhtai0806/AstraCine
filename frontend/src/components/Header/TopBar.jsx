import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import { AiFillProfile } from "react-icons/ai";
import { FaCartShopping } from "react-icons/fa6";

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
                <Link to="/profile" className="dropdown-item">
                <AiFillProfile className="icon-box" />  Tài khoản của tôi  
                </Link>

                <Link to="/order-history" className="dropdown-item">
                <FaCartShopping className="icon-box" /> Lịch sử mua hàng 
                </Link>

                <button className="dropdown-item" onClick={logout}>
                <IoIosLogOut className="icon-box" />  Đăng xuất 
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
