import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerApi } from "../../api/authApi";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    let value = e.target.value;
    if (["username", "password", "confirmPassword"].includes(e.target.name)) {
      value = value.replace(/\s/g, "");
    }
    setForm({ ...form, [e.target.name]: value });
  };

  const checkPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: "", color: "#e2e8f0" };
    if (pass.length < 6) return { score: 1, text: "Quá ngắn", color: "#ef4444" };

    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, text: "Yếu", color: "#ef4444" };
    if (score === 2) return { score: 2, text: "Trung bình", color: "#f59e0b" };
    if (score === 3) return { score: 3, text: "Khá", color: "#3b82f6" };
    if (score === 4) return { score: 4, text: "Mạnh", color: "#10b981" };
    return { score: 0, text: "", color: "#e2e8f0" };
  };

  const strength = checkPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
      return;
    }

    try {
      setLoading(true);
      await registerApi(form);
      setSuccess("Tạo tài khoản thành công! Đang chuyển hướng...");
      setForm({ username: "", fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setLoading(false);
      if (!err.response) {
        setErrors({ global: "Không thể kết nối tới máy chủ. Vui lòng thử lại." });
        return;
      }
      const data = err.response.data;
      if (data?.errors) setErrors(data.errors);
      else if (data?.message) setErrors({ global: data.message });
      else setErrors({ global: "Đăng ký thất bại. Vui lòng thử lại." });
    }
  };

  // SVGs cho Input Icons
  const IconUser = () => <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const IconMail = () => <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>;
  const IconPhone = () => <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
  const IconLock = () => <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

  return (
    <div className="astra-layout">
      {/* Cột trái: Cinematic Branding */}
      <div className="astra-banner">
        <div className="banner-overlay">
          <div className="banner-content">
            <h1 className="brand-logo">AstraCine</h1>
            <p className="brand-slogan">Trải nghiệm điện ảnh đỉnh cao.<br/>Mở khóa hàng ngàn đặc quyền ngay hôm nay.</p>
          </div>
        </div>
      </div>

      {/* Cột phải: Form Content */}
      <div className="astra-panel">
        <div className="astra-form-container">
          <div className="form-header fade-in-up">
            <h2>Bắt đầu hành trình</h2>
            <p>Điền thông tin bên dưới để tạo tài khoản mới</p>
          </div>

          {success && <div className="alert alert-success fade-in-up">{success}</div>}
          {errors.global && <div className="alert alert-danger fade-in-up">{errors.global}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row fade-in-up delay-1">
              {/* Username */}
              <div className="input-group">
                <label>Tên đăng nhập</label>
                <div className="input-wrapper">
                  <IconUser />
                  <input name="username" placeholder="Nhập tên đăng nhập" value={form.username} onChange={handleChange} />
                </div>
                {errors.username && <span className="error-text">{errors.username}</span>}
              </div>

              {/* Full Name */}
              <div className="input-group">
                <label>Họ và tên</label>
                <div className="input-wrapper">
                  <IconUser />
                  <input name="fullName" placeholder="VD: Nguyễn Văn A" value={form.fullName} onChange={handleChange} />
                </div>
                {errors.fullName && <span className="error-text">{errors.fullName}</span>}
              </div>
            </div>

            <div className="form-row fade-in-up delay-2">
              {/* Email */}
              <div className="input-group">
                <label>Địa chỉ Email</label>
                <div className="input-wrapper">
                  <IconMail />
                  <input type="email" name="email" placeholder="name@example.com" value={form.email} onChange={handleChange} />
                </div>
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="input-group">
                <label>Số điện thoại</label>
                <div className="input-wrapper">
                  <IconPhone />
                  <input name="phone" placeholder="09xx xxx xxx" value={form.phone} onChange={handleChange} />
                </div>
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            </div>

            {/* Password */}
            <div className="input-group fade-in-up delay-3">
              <label>Mật khẩu</label>
              <div className="input-wrapper">
                <IconLock />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Bảo mật bằng ký tự đặc biệt và số"
                  value={form.password}
                  onChange={handleChange}
                />
                <button type="button" className="btn-monkey" onClick={() => setShowPassword(!showPassword)} title="Ẩn/Hiện">
                  {showPassword ? "🐵" : "🙈"}
                </button>
              </div>
              
              {form.password && (
                <div className="password-meter">
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: `${(strength.score / 4) * 100}%`, backgroundColor: strength.color }}></div>
                  </div>
                  <span style={{ color: strength.color }}>{strength.text}</span>
                </div>
              )}
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="input-group fade-in-up delay-4">
              <label>Xác nhận mật khẩu</label>
              <div className="input-wrapper">
                <IconLock />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Nhập lại mật khẩu ở trên"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
                <button type="button" className="btn-monkey" onClick={() => setShowConfirmPassword(!showConfirmPassword)} title="Ẩn/Hiện">
                  {showConfirmPassword ? "🐵" : "🙈"}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" disabled={loading || success} className="btn-primary fade-in-up delay-5">
              {loading ? <span className="spinner"></span> : "Tạo Tài Khoản"}
            </button>
          </form>

          <div className="form-footer fade-in-up delay-5">
            Đã là thành viên? <Link to="/login">Đăng nhập ngay</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;