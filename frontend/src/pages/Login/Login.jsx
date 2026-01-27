import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";
import { loginApi } from "../../api/authApi";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // giữ nguyên

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
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

      login(res.data);

      const roles = res.data.roles || [];

      if (roles.includes("ROLE_ADMIN")) {
        navigate("/admin");
      } else if (roles.includes("ROLE_MANAGER")) {
        navigate("/manager");
      } else if (roles.includes("ROLE_STAFF")) {
        navigate("/staff");
      } else if (roles.includes("ROLE_CUSTOMER")) {
        navigate("/");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError("Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Đăng nhập</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            name="identifier"
            placeholder="Tài khoản / Email / SĐT"
            value={form.identifier}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
          />

          {/* ✅ CHỈ THÊM DÒNG NÀY */}
          <div className="forgot-password">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Đăng nhập"}
          </button>
        </form>

        <div className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
