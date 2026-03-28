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
    const [showPassword, setShowPassword] = useState(false);

    const IconUser = () => (
        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    );

    const IconLock = () => (
        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    );

    const extractMessage = (err, fallback) => {
    const data = err?.response?.data;

    // Ưu tiên message từ backend
    if (data?.message) {
        return data.message;
    }

    // validation errors
    if (data?.errors) {
        const firstKey = Object.keys(data.errors)[0];
        return data.errors[firstKey];
    }

    // fallback cuối cùng
    return fallback;
};

    const handleChange = (e) => {
        let value = e.target.value;
        if (e.target.name === "identifier" || e.target.name === "password") {
            value = value.replace(/\s/g, "");
        }
        setForm((prev) => ({ ...prev, [e.target.name]: value }));
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
            if (roles.includes("ROLE_ADMIN")) navigate("/admin");
            else if (roles.includes("ROLE_MANAGER")) navigate("/manager");
            else if (roles.includes("ROLE_STAFF")) navigate("/staff");
            else navigate(returnUrl || "/");
        } catch (err) {
            setError(extractMessage(err, "Sai tài khoản hoặc mật khẩu"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="astra-layout">
            <div className="astra-banner">
                <div className="banner-overlay">
                    <div className="banner-content">
                        <h1 className="brand-logo">AstraCine</h1>
                        <p className="brand-slogan">
                            Chào mừng trở lại.<br />Tiếp tục hành trình điện ảnh của bạn ngay.
                        </p>
                    </div>
                </div>
            </div>

            <div className="astra-panel">
                <div className="astra-form-container">
                    <div className="form-header fade-in-up">
                        <h2>Đăng nhập</h2>
                        <p>Truy cập vào tài khoản AstraCine của bạn</p>
                    </div>

                    <div className="alert fade-in-up" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                        Tài khoản staff do admin cấp sẵn. Nếu là nhân viên mới, hãy nhận tài khoản từ admin rồi đăng nhập để hoàn thiện hồ sơ cá nhân.
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit}>
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
                                <button
                                    type="button"
                                    className="btn-monkey"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "🐵" : "🙈"}
                                </button>
                            </div>
                        </div>

                        <div className="forgot-password fade-in-up delay-3">
                            <Link to="/forgot-password">Quên mật khẩu?</Link>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary fade-in-up delay-4">
                            {loading ? <span className="spinner"></span> : "Đăng Nhập"}
                        </button>
                    </form>

                    <div className="form-footer fade-in-up delay-5">
                        Chưa có tài khoản khách hàng? <Link to="/register">Đăng ký ngay</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
