import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";
import { loginApi } from "../../api/authApi";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); // ⭐ BẮT BUỘC

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

      switch (res.data.role) {
        case "ADMIN":
          navigate("/admin");
          break;

        case "STAFF":
          navigate("/staff");
          break;

        default: // CUSTOMER
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
