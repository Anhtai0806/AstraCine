import "./Register.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { registerApi, submitStaffApplicationApi } from "../../api/authApi";

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

const briefcaseIcon = (
    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
);

function Register() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("customer");

    const [customerForm, setCustomerForm] = useState({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });

    const [staffForm, setStaffForm] = useState({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        desiredPosition: "",
    });

    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const [showCustomerPassword, setShowCustomerPassword] = useState(false);
    const [showCustomerConfirmPassword, setShowCustomerConfirmPassword] = useState(false);
    const [showStaffPassword, setShowStaffPassword] = useState(false);
    const [showStaffConfirmPassword, setShowStaffConfirmPassword] = useState(false);

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

    const customerStrength = checkPasswordStrength(customerForm.password);
    const staffStrength = checkPasswordStrength(staffForm.password);

    const handleCustomerChange = (e) => {
        const { name } = e.target;
        let value = e.target.value;

        if (["username", "password", "confirmPassword"].includes(name)) {
            value = String(value).replace(/\s/g, "");
        }

        setCustomerForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleStaffChange = (e) => {
        const { name } = e.target;
        let value = e.target.value;

        if (["username", "password", "confirmPassword"].includes(name)) {
            value = String(value).replace(/\s/g, "");
        }

        setStaffForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCustomerSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccess("");

        if (customerForm.password !== customerForm.confirmPassword) {
            setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
            return;
        }

        try {
            setLoading(true);

            await registerApi(customerForm);

            setSuccess("Tạo tài khoản thành công! Đang chuyển hướng...");
            setCustomerForm({
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
            if (data?.errors) setErrors(data.errors);
            else if (data?.message) setErrors({ global: data.message });
            else setErrors({ global: "Đăng ký thất bại. Vui lòng thử lại." });
            return;
        } finally {
            setLoading(false);
        }
    };

    const handleStaffSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccess("");

        if (staffForm.password !== staffForm.confirmPassword) {
            setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp" });
            return;
        }

        if (!staffForm.desiredPosition.trim()) {
            setErrors({ desiredPosition: "Vui lòng nhập vị trí mong muốn" });
            return;
        }

        try {
            setLoading(true);

            await submitStaffApplicationApi({
                username: staffForm.username,
                fullName: staffForm.fullName,
                email: staffForm.email,
                phone: staffForm.phone,
                password: staffForm.password,
                confirmPassword: staffForm.confirmPassword,
                desiredPosition: staffForm.desiredPosition.trim(),
            });

            setSuccess("Đã gửi yêu cầu tạo tài khoản staff đến admin. Khi được duyệt, tài khoản staff sẽ được tạo cho bạn.");
            setStaffForm({
                username: "",
                fullName: "",
                email: "",
                phone: "",
                password: "",
                confirmPassword: "",
                desiredPosition: "",
            });

            setTimeout(() => navigate("/login"), 2200);
        } catch (err) {
            if (!err.response) {
                setErrors({ global: "Không thể kết nối tới máy chủ. Vui lòng thử lại." });
                return;
            }

            const data = err.response.data;
            if (data?.errors) setErrors(data.errors);
            else if (data?.message) setErrors({ global: data.message });
            else setErrors({ global: "Gửi yêu cầu thất bại. Vui lòng thử lại." });
            return;
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
                    <div className="auth-tabs fade-in-up">
                        <button
                            type="button"
                            className={activeTab === "customer" ? "auth-tab active" : "auth-tab"}
                            onClick={() => {
                                setActiveTab("customer");
                                setErrors({});
                                setSuccess("");
                            }}
                        >
                            Đăng ký khách hàng
                        </button>
                        <button
                            type="button"
                            className={activeTab === "staff-request" ? "auth-tab active" : "auth-tab"}
                            onClick={() => {
                                setActiveTab("staff-request");
                                setErrors({});
                                setSuccess("");
                            }}
                        >
                            Yêu cầu tài khoản staff
                        </button>
                    </div>

                    {activeTab === "customer" && (
                        <>
                            <div className="form-header fade-in-up">
                                <h2>Bắt đầu hành trình</h2>
                                <p>Điền thông tin bên dưới để tạo tài khoản khách hàng mới.</p>
                            </div>

                            {success && <div className="alert alert-success fade-in-up">{success}</div>}
                            {errors.global && <div className="alert alert-danger fade-in-up">{errors.global}</div>}

                            <form onSubmit={handleCustomerSubmit}>
                                <div className="form-row fade-in-up delay-1">
                                    <div className="input-group">
                                        <label>Tên đăng nhập</label>
                                        <div className="input-wrapper">
                                            {userIcon}
                                            <input
                                                name="username"
                                                placeholder="Nhập tên đăng nhập"
                                                value={customerForm.username}
                                                onChange={handleCustomerChange}
                                            />
                                        </div>
                                        {errors.username && <span className="error-text">{errors.username}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Họ và tên</label>
                                        <div className="input-wrapper">
                                            {userIcon}
                                            <input
                                                name="fullName"
                                                placeholder="VD: Nguyễn Văn A"
                                                value={customerForm.fullName}
                                                onChange={handleCustomerChange}
                                            />
                                        </div>
                                        {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                                    </div>
                                </div>

                                <div className="form-row fade-in-up delay-2">
                                    <div className="input-group">
                                        <label>Địa chỉ Email</label>
                                        <div className="input-wrapper">
                                            {mailIcon}
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="name@example.com"
                                                value={customerForm.email}
                                                onChange={handleCustomerChange}
                                            />
                                        </div>
                                        {errors.email && <span className="error-text">{errors.email}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Số điện thoại</label>
                                        <div className="input-wrapper">
                                            {phoneIcon}
                                            <input
                                                name="phone"
                                                placeholder="09xx xxx xxx"
                                                value={customerForm.phone}
                                                onChange={handleCustomerChange}
                                            />
                                        </div>
                                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                                    </div>
                                </div>

                                <div className="input-group fade-in-up delay-4">
                                    <label>Mật khẩu</label>
                                    <div className="input-wrapper">
                                        {lockIcon}
                                        <input
                                            type={showCustomerPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Bảo mật bằng ký tự đặc biệt và số"
                                            value={customerForm.password}
                                            onChange={handleCustomerChange}
                                        />
                                        <button
                                            type="button"
                                            className="btn-monkey"
                                            onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                                            title="Ẩn/Hiện"
                                        >
                                            {showCustomerPassword ? "🐵" : "🙈"}
                                        </button>
                                    </div>

                                    {customerForm.password && (
                                        <div className="password-meter">
                                            <div className="meter-track">
                                                <div
                                                    className="meter-fill"
                                                    style={{
                                                        width: `${(customerStrength.score / 4) * 100}%`,
                                                        backgroundColor: customerStrength.color,
                                                    }}
                                                ></div>
                                            </div>
                                            <span style={{ color: customerStrength.color }}>{customerStrength.text}</span>
                                        </div>
                                    )}
                                    {errors.password && <span className="error-text">{errors.password}</span>}
                                </div>

                                <div className="input-group fade-in-up delay-5">
                                    <label>Xác nhận mật khẩu</label>
                                    <div className="input-wrapper">
                                        {lockIcon}
                                        <input
                                            type={showCustomerConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            placeholder="Nhập lại mật khẩu ở trên"
                                            value={customerForm.confirmPassword}
                                            onChange={handleCustomerChange}
                                        />
                                        <button
                                            type="button"
                                            className="btn-monkey"
                                            onClick={() => setShowCustomerConfirmPassword(!showCustomerConfirmPassword)}
                                            title="Ẩn/Hiện"
                                        >
                                            {showCustomerConfirmPassword ? "🐵" : "🙈"}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                </div>

                                <button type="submit" disabled={loading || Boolean(success)} className="btn-primary fade-in-up delay-5">
                                    {loading ? <span className="spinner"></span> : "Tạo Tài Khoản"}
                                </button>
                            </form>
                        </>
                    )}

                    {activeTab === "staff-request" && (
                        <>
                            <div className="form-header fade-in-up">
                                <h2>Yêu cầu tài khoản nhân viên</h2>
                                <p>Điền thông tin bên dưới để gửi yêu cầu tạo tài khoản staff cho admin duyệt.</p>
                            </div>

                            {success && <div className="alert alert-success fade-in-up">{success}</div>}
                            {errors.global && <div className="alert alert-danger fade-in-up">{errors.global}</div>}

                            <form onSubmit={handleStaffSubmit}>
                                <div className="form-row fade-in-up delay-1">
                                    <div className="input-group">
                                        <label>Tên đăng nhập</label>
                                        <div className="input-wrapper">
                                            {userIcon}
                                            <input
                                                name="username"
                                                placeholder="Nhập tên đăng nhập"
                                                value={staffForm.username}
                                                onChange={handleStaffChange}
                                            />
                                        </div>
                                        {errors.username && <span className="error-text">{errors.username}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Họ và tên</label>
                                        <div className="input-wrapper">
                                            {userIcon}
                                            <input
                                                name="fullName"
                                                placeholder="VD: Nguyễn Văn A"
                                                value={staffForm.fullName}
                                                onChange={handleStaffChange}
                                            />
                                        </div>
                                        {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                                    </div>
                                </div>

                                <div className="form-row fade-in-up delay-2">
                                    <div className="input-group">
                                        <label>Địa chỉ Email</label>
                                        <div className="input-wrapper">
                                            {mailIcon}
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="name@example.com"
                                                value={staffForm.email}
                                                onChange={handleStaffChange}
                                            />
                                        </div>
                                        {errors.email && <span className="error-text">{errors.email}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label>Số điện thoại</label>
                                        <div className="input-wrapper">
                                            {phoneIcon}
                                            <input
                                                name="phone"
                                                placeholder="09xx xxx xxx"
                                                value={staffForm.phone}
                                                onChange={handleStaffChange}
                                            />
                                        </div>
                                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                                    </div>
                                </div>

                                <div className="input-group fade-in-up delay-3">
                                    <label>Vị trí mong muốn</label>
                                    <div className="input-wrapper">
                                        {briefcaseIcon}
                                        <input
                                            name="desiredPosition"
                                            placeholder="VD: Nhân viên quầy, soát vé, quầy combo"
                                            value={staffForm.desiredPosition}
                                            onChange={handleStaffChange}
                                        />
                                    </div>
                                    {errors.desiredPosition && <span className="error-text">{errors.desiredPosition}</span>}
                                </div>

                                <div className="input-group fade-in-up delay-4">
                                    <label>Mật khẩu</label>
                                    <div className="input-wrapper">
                                        {lockIcon}
                                        <input
                                            type={showStaffPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Nhập mật khẩu"
                                            value={staffForm.password}
                                            onChange={handleStaffChange}
                                        />
                                        <button
                                            type="button"
                                            className="btn-monkey"
                                            onClick={() => setShowStaffPassword(!showStaffPassword)}
                                            title="Ẩn/Hiện"
                                        >
                                            {showStaffPassword ? "🐵" : "🙈"}
                                        </button>
                                    </div>

                                    {staffForm.password && (
                                        <div className="password-meter">
                                            <div className="meter-track">
                                                <div
                                                    className="meter-fill"
                                                    style={{
                                                        width: `${(staffStrength.score / 4) * 100}%`,
                                                        backgroundColor: staffStrength.color,
                                                    }}
                                                ></div>
                                            </div>
                                            <span style={{ color: staffStrength.color }}>{staffStrength.text}</span>
                                        </div>
                                    )}
                                    {errors.password && <span className="error-text">{errors.password}</span>}
                                </div>

                                <div className="input-group fade-in-up delay-5">
                                    <label>Xác nhận mật khẩu</label>
                                    <div className="input-wrapper">
                                        {lockIcon}
                                        <input
                                            type={showStaffConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            placeholder="Nhập lại mật khẩu"
                                            value={staffForm.confirmPassword}
                                            onChange={handleStaffChange}
                                        />
                                        <button
                                            type="button"
                                            className="btn-monkey"
                                            onClick={() => setShowStaffConfirmPassword(!showStaffConfirmPassword)}
                                            title="Ẩn/Hiện"
                                        >
                                            {showStaffConfirmPassword ? "🐵" : "🙈"}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                                </div>

                                <button type="submit" disabled={loading || Boolean(success)} className="btn-primary fade-in-up delay-5">
                                    {loading ? <span className="spinner"></span> : "Gửi yêu cầu tạo tài khoản staff"}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="form-footer fade-in-up delay-5">
                        Đã là thành viên? <Link to="/login">Đăng nhập ngay</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;