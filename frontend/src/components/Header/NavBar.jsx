import { Link } from "react-router-dom";
import "./Header.css";
import logo from "../../assets/logo.png";

function NavBar() {
  return (
    <div className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="logo">
          <Link to="/">
            <img src={logo} alt="AstraCine" />
          </Link>
        </div>

        {/* Menu */}
        <ul className="menu">
          <li>Trang chủ</li>
          <li>Phim</li>
          <li>Lịch chiếu</li>
          <li>Giá vé</li>
          <li>Tin mới & ưu đãi</li>
          <li>Thành viên</li>
        </ul>
      </div>
    </div>
  );
}

export default NavBar;
