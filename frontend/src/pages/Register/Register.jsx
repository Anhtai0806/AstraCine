import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerApi } from "../../api/authApi";

const userIcon = (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const mailIcon = (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
    </svg>
);

const phoneIcon = (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const lockIcon = (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

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
        return { score: 4, text: "Mạnh", color: "#10b981" };
    };

    const strength = checkPasswordStrength(form.password);

    const getErrorWrapperStyle = (fieldName) => {
        if (!errors[fieldName]) return undefined;
        return {
            borderColor: "#ef4444",
            background: "#fff5f5",
            boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.12)",
        };
    };

    const handleChange = (e) => {
        const { name } = e.target;
        let value = e.target.value;

        if (["username", "password", "confirmPassword"].includes(name)) {
            value = String(value).replace(/\s/g, "");
        }

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

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
            setForm({
                username: "",
                fullName: "",
                email: "",
                phone: "",
                password: "",
                confirmPassword: "",
            });

            setTimeout(() => navigate("/login"), 2200);
        } catch (err) {
            if (!err.response) {
                setErrors({ global: "Không thể kết nối tới máy chủ. Vui lòng thử lại." });
                return;
            }

            const data = err.response.data;

            if (data?.errors) {
                setErrors(data.errors);
                return;
            }

            if (data?.message) {
                const message = String(data.message).toLowerCase();

                if (message.includes("email")) {
                    setErrors({ email: "Email đã được sử dụng" });
                    return;
                }

                if (message.includes("phone")) {
                    setErrors({ phone: "Số điện thoại đã được sử dụng" });
                    return;
                }

                if (message.includes("username")) {
                    setErrors({ username: "Tên đăng nhập đã tồn tại" });
                    return;
                }

                if (message.includes("password confirmation")) {
                    setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
                    return;
                }

                setErrors({ global: data.message });
                return;
            }

            setErrors({ global: "Đăng ký thất bại. Vui lòng thử lại." });
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
                            Trải nghiệm điện ảnh đỉnh cao.
                            <br />
                            Mở khóa hàng ngàn đặc quyền ngay hôm nay.
                        </p>
                    </div>
                </div>
            </div>

            <div className="astra-panel">
                <div className="astra-form-container">
                    <div className="form-header fade-in-up">
                        <h2>Đăng ký khách hàng</h2>
                        <p>Tạo tài khoản khách hàng để đặt vé, theo dõi lịch sử và nhận ưu đãi</p>
                    </div>

                    <div className="alert fade-in-up" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                        Tài khoản staff không còn đăng ký tại đây. Admin sẽ cấp sẵn tài khoản staff cho nhân viên.
                    </div>

                    {errors.global && <div className="alert alert-danger fade-in-up">{errors.global}</div>}
                    {success && <div className="alert alert-success fade-in-up">{success}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="input-group fade-in-up delay-1">
                            <label>Tên đăng nhập</label>
                            <div className="input-wrapper" style={getErrorWrapperStyle("username")}>
                                {userIcon}
                                <input
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="Nhập tên đăng nhập"
                                    required
                                />
                            </div>
                            {errors.username && <small className="error-text">{errors.username}</small>}
                        </div>

                        <div className="input-group fade-in-up delay-1">
                            <label>Họ và tên</label>
                            <div className="input-wrapper" style={getErrorWrapperStyle("fullName")}>
                                {userIcon}
                                <input
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    placeholder="Nhập họ và tên"
                                    required
                                />
                            </div>
                            {errors.fullName && <small className="error-text">{errors.fullName}</small>}
                        </div>

                        <div className="input-group fade-in-up delay-2">
                            <label>Email</label>
                            <div className="input-wrapper" style={getErrorWrapperStyle("email")}>
                                {mailIcon}
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="Nhập email"
                                    required
                                />
                            </div>
                            {errors.email && <small className="error-text">{errors.email}</small>}
                        </div>

                        <div className="input-group fade-in-up delay-2">
                            <label>Số điện thoại</label>
                            <div className="input-wrapper" style={getErrorWrapperStyle("phone")}>
                                {phoneIcon}
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Nhập số điện thoại"
                                    required
                                />
                            </div>
                            {errors.phone && <small className="error-text">{errors.phone}</small>}
                        </div>

                        <div className="input-group fade-in-up delay-3">
                            <label>Mật khẩu</label>
                            <div className="input-wrapper" style={getErrorWrapperStyle("password")}>
                                {lockIcon}
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Nhập mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-monkey"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? "🐵" : "🙈"}
                                </button>
                            </div>

                            {!!form.password && (
                                <div className="password-strength">
                                    <div className="password-strength-bar">
                                        <span
                                            style={{
                                                width: `${(strength.score / 4) * 100}%`,
                                                background: strength.color,
                                            }}
                                        />
                                    </div>
                                    <small style={{ color: strength.color }}>{strength.text}</small>
                                </div>
                            )}

                            {errors.password && <small className="error-text">{errors.password}</small>}
                        </div>

                        <div className="input-group fade-in-up delay-4">
                            <label>Xác nhận mật khẩu</label>
                            <div className="input-wrapper" style={getErrorWrapperStyle("confirmPassword")}>
                                {lockIcon}
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Nhập lại mật khẩu"
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn-monkey"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                >
                                    {showConfirmPassword ? "🐵" : "🙈"}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <small className="error-text">{errors.confirmPassword}</small>
                            )}
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary fade-in-up delay-5">
                            {loading ? <span className="spinner"></span> : "Đăng Ký"}
                        </button>
                    </form>

                    <div className="form-footer fade-in-up delay-5">
                        Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;