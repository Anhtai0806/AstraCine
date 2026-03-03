import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/authApi";
import "./ForgotPassword.css";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            setStatus("error");
            setMessage("Vui lòng nhập địa chỉ email.");
            return;
        }

        try {
            setStatus("loading");
            setMessage("");
            await forgotPasswordApi(email.trim());
            setStatus("success");
            setMessage(
                "Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư (kể cả thư mục Spam)."
            );
        } catch (err) {
            setStatus("error");
            const data = err?.response?.data;
            // Validation error map: {errors: {email: 'msg', ...}}
            if (data?.errors) {
                const firstMsg = Object.values(data.errors)[0];
                setMessage(firstMsg || "Dữ liệu không hợp lệ.");
            } else if (typeof data?.message === "string") {
                setMessage(data.message);
            } else if (typeof data === "string") {
                setMessage(data);
            } else {
                setMessage("Không tìm thấy tài khoản với email này.");
            }
        }
    };

    return (
        <div className="auth-page fp-bg">
            <div className="auth-card fp-card">
                {/* Icon */}
                <div className="fp-icon-wrap">
                    <span className="fp-icon">🔑</span>
                </div>

                <h2>Quên mật khẩu?</h2>
                <p className="fp-desc">
                    Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật
                    khẩu đến hòm thư của bạn.
                </p>

                {/* Success State */}
                {status === "success" ? (
                    <div className="fp-success-box">
                        <span className="fp-success-icon">✅</span>
                        <p>{message}</p>
                        <p className="fp-success-hint">
                            Link có hiệu lực trong <strong>15 phút</strong>.
                        </p>
                        <button
                            className="fp-btn-resend"
                            onClick={() => {
                                setStatus("idle");
                                setEmail("");
                                setMessage("");
                            }}
                        >
                            Gửi lại email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {status === "error" && (
                            <div className="auth-error">{message}</div>
                        )}

                        <div className="fp-input-group">
                            <span className="fp-input-icon">✉️</span>
                            <input
                                type="email"
                                placeholder="Địa chỉ email của bạn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={status === "loading"}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="fp-submit-btn"
                        >
                            {status === "loading" ? (
                                <span className="fp-spinner">⏳ Đang gửi...</span>
                            ) : (
                                "Gửi email đặt lại mật khẩu"
                            )}
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

export default ForgotPassword;
