import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";
import { loginApi } from "../../api/authApi";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const returnUrl = location.state?.from?.pathname;

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // State ẩn/hiện mật khẩu khỉ
  const [showPassword, setShowPassword] = useState(false);

  // Chặn dấu cách
  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === "identifier" || e.target.name === "password") {
      value = value.replace(/\s/g, ""); // Tự động xóa khoảng trắng
    }
    setForm({
      ...form,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.identifier || !form.password) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await loginApi(form);

      // Thêm password vào response data để lưu cho Basic Auth
      const userDataWithPassword = {
        ...res.data,
        password: form.password // Lưu password để dùng cho Basic Auth
      };

      login(userDataWithPassword);

      const roles = res.data.roles || [];

      if (roles.includes("ROLE_ADMIN")) {
        navigate("/admin");
      } else if (roles.includes("ROLE_MANAGER")) {
        navigate("/manager");
      } else if (roles.includes("ROLE_STAFF")) {
        navigate("/staff");
      } else {
        // ROLE_CUSTOMER hoặc khác: ưu tiên redirect về trang đã chọn trước đó
        navigate(returnUrl || "/");
      }
    } catch (err) {
      setError("Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  // SVGs cho Input
  const IconUser = () => <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const IconLock = () => <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

  return (
    <div className="astra-layout">
      {/* Cột trái: Cinematic Branding (Đổi ảnh nền cho đa dạng) */}
      <div className="astra-banner">
        <div className="banner-overlay">
          <div className="banner-content">
            <h1 className="brand-logo">AstraCine</h1>
            <p className="brand-slogan">Chào mừng trở lại.<br/>Tiếp tục hành trình điện ảnh của bạn ngay.</p>
          </div>
        </div>
      </div>

      {/* Cột phải: Form Content */}
      <div className="astra-panel">
        <div className="astra-form-container">
          <div className="form-header fade-in-up">
            <h2>Đăng nhập</h2>
            <p>Truy cập vào tài khoản AstraCine của bạn</p>
          </div>

          {error && <div className="alert alert-danger fade-in-up">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Identifier */}
            <div className="input-group fade-in-up delay-1">
              <label>Tài khoản / Email / SĐT</label>
              <div className="input-wrapper">
                <IconUser />
                <input
                  name="identifier"
                  placeholder="Nhập thông tin đăng nhập"
                  value={form.identifier}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group fade-in-up delay-2">
              <label>Mật khẩu</label>
              <div className="input-wrapper">
                <IconLock />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Nhập mật khẩu"
                  value={form.password}
                  onChange={handleChange}
                />
                <button type="button" className="btn-monkey" onClick={() => setShowPassword(!showPassword)} title="Ẩn/Hiện">
                  {showPassword ? "🐵" : "🙈"}
                </button>
              </div>
            </div>

            {/* Quên mật khẩu */}
            <div className="forgot-password fade-in-up delay-3">
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary fade-in-up delay-4">
              {loading ? <span className="spinner"></span> : "Đăng Nhập"}
            </button>
          </form>

          <div className="form-footer fade-in-up delay-5">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;