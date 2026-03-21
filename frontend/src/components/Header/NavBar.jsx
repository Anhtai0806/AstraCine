import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Header.css";
import logo from "../../assets/logo.png";

function NavBar() {
    const { user } = useAuth();
    const isStaffOnlyUser = user?.roles?.includes("ROLE_STAFF") && !user?.roles?.includes("ROLE_ADMIN");

    if (isStaffOnlyUser) {
        return null;
    }

    return (
        <div className="navbar">
            <div className="navbar-container">
                <div className="logo">
                    <Link to="/">
                        <img src={logo} alt="AstraCine" />
                    </Link>
                </div>

                <ul className="menu">
                    <Link to="/"><li>Trang chủ</li></Link>
                    <Link to="/movies"><li>Phim</li></Link>
                    <Link to="/booking"><li>Lịch chiếu</li></Link>
                    <li>Giá vé</li>
                    <li>Tin mới & ưu đãi</li>
                    <li>Thành viên</li>
                </ul>
            </div>
        </div>
    );
}

export default NavBar;
