import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPasswordApi } from "../../api/authApi";
import "./ResetPassword.css";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get("token");

    const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [message, setMessage] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Kiểm tra token ngay khi vào trang
    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Link không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới từ trang đăng nhập.");
        }
    }, [token]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.newPassword || form.newPassword.length < 6) {
            setStatus("error");
            setMessage("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            setStatus("error");
            setMessage("Mật khẩu xác nhận không khớp. Vui lòng thử lại.");
            return;
        }

        try {
            setStatus("loading");
            setMessage("");
            await resetPasswordApi(token, form.newPassword);
            setStatus("success");
        } catch (err) {
            setStatus("error");
            const serverMsg =
                err?.response?.data?.message ||
                err?.response?.data ||
                "Token không hợp lệ hoặc đã hết hạn.";
            setMessage(typeof serverMsg === "string" ? serverMsg : "Đã có lỗi xảy ra. Vui lòng thử lại.");
        }
    };

    // Tính độ mạnh mật khẩu
    const getPasswordStrength = (pwd) => {
        if (!pwd) return null;
        if (pwd.length < 6) return { level: "weak", label: "Quá ngắn", color: "#ef4444" };
        if (pwd.length < 8) return { level: "fair", label: "Trung bình", color: "#f59e0b" };
        if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && pwd.length >= 10)
            return { level: "strong", label: "Mạnh", color: "#22c55e" };
        return { level: "good", label: "Tốt", color: "#3b82f6" };
    };

    const strength = getPasswordStrength(form.newPassword);

    // ===== SUCCESS STATE =====
    if (status === "success") {
        return (
            <div className="auth-page rp-bg">
                <div className="auth-card rp-card rp-success-card">
                    <div className="rp-success-anim">🎉</div>
                    <h2>Đặt lại thành công!</h2>
                    <p className="rp-success-msg">
                        Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.
                    </p>
                    <button
                        className="rp-submit-btn"
                        onClick={() => navigate("/login")}
                    >
                        Đăng nhập ngay
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page rp-bg">
            <div className="auth-card rp-card">
                <div className="rp-icon-wrap">
                    <span className="rp-icon">🔒</span>
                </div>

                <h2>Đặt lại mật khẩu</h2>
                <p className="rp-desc">
                    Nhập mật khẩu mới cho tài khoản AstraCine của bạn.
                </p>

                {/* Token invalid - không có form */}
                {!token ? (
                    <div className="auth-error" style={{ textAlign: "center" }}>
                        {message}
                        <div className="auth-footer" style={{ marginTop: "16px" }}>
                            <Link to="/forgot-password">Yêu cầu đặt lại mật khẩu mới</Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {status === "error" && (
                            <div className="auth-error">
                                {message}
                                {message.toLowerCase().includes("hết hạn") ||
                                    message.toLowerCase().includes("không hợp lệ") ? (
                                    <div style={{ marginTop: "8px" }}>
                                        <Link to="/forgot-password" style={{ color: "#b91c1c", fontWeight: 600 }}>
                                            Gửi lại email đặt lại mật khẩu →
                                        </Link>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Mật khẩu mới */}
                        <div className="rp-input-group">
                            <input
                                type={showPass ? "text" : "password"}
                                name="newPassword"
                                placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                                value={form.newPassword}
                                onChange={handleChange}
                                disabled={status === "loading"}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="rp-eye-btn"
                                onClick={() => setShowPass(!showPass)}
                                tabIndex={-1}
                            >
                                {showPass ? "🙈" : "👁️"}
                            </button>
                        </div>

                        {/* Thanh độ mạnh */}
                        {strength && (
                            <div className="rp-strength-bar-wrap">
                                <div
                                    className="rp-strength-bar"
                                    style={{
                                        background: strength.color, width:
                                            strength.level === "weak" ? "25%" :
                                                strength.level === "fair" ? "50%" :
                                                    strength.level === "good" ? "75%" : "100%"
                                    }}
                                />
                                <span className="rp-strength-label" style={{ color: strength.color }}>
                                    {strength.label}
                                </span>
                            </div>
                        )}

                        {/* Xác nhận mật khẩu */}
                        <div className="rp-input-group">
                            <input
                                type={showConfirm ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Xác nhận mật khẩu mới"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                disabled={status === "loading"}
                            />
                            <button
                                type="button"
                                className="rp-eye-btn"
                                onClick={() => setShowConfirm(!showConfirm)}
                                tabIndex={-1}
                            >
                                {showConfirm ? "🙈" : "👁️"}
                            </button>
                        </div>

                        {/* Match indicator */}
                        {form.confirmPassword && (
                            <p className="rp-match-hint" style={{
                                color: form.newPassword === form.confirmPassword ? "#22c55e" : "#ef4444"
                            }}>
                                {form.newPassword === form.confirmPassword
                                    ? "✓ Mật khẩu khớp"
                                    : "✗ Mật khẩu chưa khớp"}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="rp-submit-btn"
                        >
                            {status === "loading" ? "⏳ Đang xử lý..." : "Đặt lại mật khẩu"}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <Link to="/login">← Quay lại đăng nhập</Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;
