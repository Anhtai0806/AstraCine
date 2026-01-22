import "./Header.css";

function TopBar() {
  return (
    <div className="topbar">
      <div className="topbar-container">
        <div className="topbar-right">
          <a href="/login">Đăng nhập</a>
          <span>|</span>
          <a href="/register">Đăng ký</a>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
