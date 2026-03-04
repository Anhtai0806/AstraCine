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

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    // ===== Frontend confirm password =====
    if (form.password !== form.confirmPassword) {
      setErrors({
        confirmPassword: "Mật khẩu xác nhận không khớp",
      });
      return;
    }

    try {
      setLoading(true);

      await registerApi({
        username: form.username,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setSuccess("Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập.");

      // reset form
      setForm({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setLoading(false);

      if (!err.response) {
        setErrors({ global: "Không thể kết nối tới server" });
        return;
      }

      const data = err.response.data;

      // lỗi validate theo field
      if (data?.errors) {
        setErrors(data.errors);
      }
      // lỗi global
      else if (data?.message) {
        setErrors({ global: data.message });
      } else {
        setErrors({ global: "Đăng ký thất bại. Vui lòng thử lại." });
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Đăng ký</h2>
        <p>Chào mừng bạn đến với AstraCine</p>

        {success && <div className="auth-success">{success}</div>}
        {errors.global && <div className="auth-error">{errors.global}</div>}

        <form onSubmit={handleSubmit}>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />
          {errors.username && (
            <small className="field-error">{errors.username}</small>
          )}

          <input
            name="fullName"
            placeholder="Họ và tên"
            value={form.fullName}
            onChange={handleChange}
          />
          {errors.fullName && (
            <small className="field-error">{errors.fullName}</small>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && (
            <small className="field-error">{errors.email}</small>
          )}

          <input
            name="phone"
            placeholder="Số điện thoại"
            value={form.phone}
            onChange={handleChange}
          />
          {errors.phone && (
            <small className="field-error">{errors.phone}</small>
          )}

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
          />
          {errors.password && (
            <small className="field-error">{errors.password}</small>
          )}

          <input
            type="password"
            name="confirmPassword"
            placeholder="Xác nhận mật khẩu"
            value={form.confirmPassword}
            onChange={handleChange}
          />
          {errors.confirmPassword && (
            <small className="field-error">{errors.confirmPassword}</small>
          )}

          <button type="submit" disabled={loading || success}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;

//chỉnh sửa