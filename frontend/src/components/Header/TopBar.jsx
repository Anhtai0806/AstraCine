import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { IoIosLogOut } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import { AiFillProfile } from "react-icons/ai";
import { FaCartShopping } from "react-icons/fa6";

import "./Header.css";

function TopBar() {
    const { user, logout } = useAuth();
    const isStaffOnlyUser = user?.roles?.includes("ROLE_STAFF") && !user?.roles?.includes("ROLE_ADMIN");

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
                                <Link to={isStaffOnlyUser ? "/staff/profile" : "/profile"} className="logout-btn">
                                    Tài khoản của tôi
                                </Link>

                                {!isStaffOnlyUser && (
                                    <Link to="/order-history" className="logout-btn">
                                        Lịch sử mua hàng
                                    </Link>
                                )}

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
//sửa topbar 