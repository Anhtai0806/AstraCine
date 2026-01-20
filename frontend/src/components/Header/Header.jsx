import "./Header.css";
import {Link} from "react-router-dom";
import logo from "../../assets/logo.png";

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
        <img src={logo} alt="AsstraCine Logo" />
        </Link>
      </div>

      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
        <Link to="/movies">Movies</Link>
        <Link to="/about">About</Link>
      </nav>
    </header>
  );
}

export default Header;
