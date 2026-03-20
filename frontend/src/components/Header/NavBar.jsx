import { NavLink } from "react-router-dom";
import "./Header.css";
import logo from "../../assets/logo.png";

function NavBar() {
  return (
    <div className="navbar">
      <div className="navbar-container">
        
        {/* Logo */}
        <div className="logo">
          <NavLink to="/">
            <img src={logo} alt="AstraCine" />
          </NavLink>
        </div>

        {/* Menu */}
        <ul className="menu">
          <li>
            <NavLink to="/" end>
              Trang chủ
            </NavLink>
          </li>

          <li>
            <NavLink to="/movies">
              Phim
            </NavLink>
          </li>

          <li>
            <NavLink to="/booking">
              Lịch chiếu
            </NavLink>
          </li>

          <li>
            <NavLink to="/news">
              Tin mới & ưu đãi
            </NavLink>
          </li>

          <li>
            <NavLink to="/member">
              Thành viên
            </NavLink>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default NavBar;