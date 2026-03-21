import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { userApi } from "../../api/userApi";
import "./ProfilePage.css";

function ProfilePage() {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [profileData, setProfileData] = useState({
        fullName: "",
        email: "",
        phone: "",
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordSubmitAttempted, setPasswordSubmitAttempted] = useState(false);
    const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
    const [activeTab, setActiveTab] = useState("profile");

    const passwordRequirements = [
        {
            id: "length",
            message: "M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 8 k\u00fd t\u1ef1",
            isValid: passwordData.newPassword.length >= 8,
        },
        {
            id: "uppercase",
            message: "M\u1eadt kh\u1ea9u ph\u1ea3i ch\u1ee9a \u00edt nh\u1ea5t m\u1ed9t ch\u1eef c\u00e1i vi\u1ebft hoa",
            isValid: /[A-Z]/.test(passwordData.newPassword),
        },
        {
            id: "special",
            message: "M\u1eadt kh\u1ea9u ph\u1ea3i ch\u1ee9a \u00edt nh\u1ea5t m\u1ed9t k\u00fd t\u1ef1 \u0111\u1eb7c bi\u1ec7t",
            isValid: /[!@#$%^&*(),.?\":{}|<>]/.test(passwordData.newPassword),
        },
    ];
    const missingPasswordRequirements = passwordRequirements.filter((rule) => !rule.isValid);
    const showPasswordRequirementsAlert =
        activeTab === "security" &&
        passwordSubmitAttempted &&
        isCurrentPasswordVerified &&
        passwordData.newPassword.length > 0 &&
        missingPasswordRequirements.length > 0;
    const isRequirementError =
        !!error && missingPasswordRequirements.some((rule) => rule.message === error);

    // Load profile data
    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }

        // Sử dụng dữ liệu từ user context
        setProfileData({
            fullName: user.fullName || "",
            email: user.email || "",
            phone: user.phone || "",
        });
    }, [user, navigate]);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;

        if (name === "currentPassword") {
            setIsCurrentPasswordVerified(false);
        }

        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError("");

            // Normalize data before sending
            const normalizedData = {
                fullName: profileData.fullName.trim(),
                email: profileData.email.trim().toLowerCase(),
                phone: profileData.phone.trim(),
            };

            console.log("Sending normalized profileData:", normalizedData);
            console.log("Current user email:", user.email);

            const response = await userApi.updateProfile(normalizedData);

            // Cập nhật user context với dữ liệu mới
            login({
                ...user,
                fullName: response.data.fullName,
                email: response.data.email,
                phone: response.data.phone,
                staffApplicationStatus: response.data.staffApplicationStatus,
            });

            setSuccessMessage("Cập nhật thông tin thành công!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Error updating profile:", err);
            setError(err.response?.data?.message || "Cập nhật thông tin thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordSubmitAttempted(true);

        try {
            setLoading(true);
            setError("");
            await userApi.changePassword(passwordData);
            setSuccessMessage("Đổi mật khẩu thành công!");
            setPasswordSubmitAttempted(false);
            setIsCurrentPasswordVerified(false);
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
            console.error("Error changing password:", err);
            const message = err.response?.data?.message || "Đổi mật khẩu thất bại";
            setError(message);
            const isCurrentPasswordError = /mật khẩu hiện tại|current password/i.test(message);
            setIsCurrentPasswordVerified(!isCurrentPasswordError);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="profile-page">
            <div className="profile-container">
                <div className="profile-header">
                    <h1>Tài khoản của tôi</h1>
                    <p>Quản lý thông tin và bảo mật tài khoản của bạn</p>
                </div>

                <div className="profile-content">
                    {/* Tabs */}
                    <div className="profile-tabs">
                        <button
                            className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
                            onClick={() => setActiveTab("profile")}
                        >
                            Thông tin cá nhân
                        </button>
                        <button
                            className={`tab-button ${activeTab === "security" ? "active" : ""}`}
                            onClick={() => setActiveTab("security")}
                        >
                            Bảo mật
                        </button>
                    </div>

                    {/* Messages */}
                    {(error || showPasswordRequirementsAlert) && (
                        <div className="alert alert-error">
                            {error && !isRequirementError && <div>{error}</div>}
                            {showPasswordRequirementsAlert && (
                                <ul className="alert-list">
                                    {missingPasswordRequirements.map((rule) => (
                                        <li key={rule.id}>{rule.message}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {successMessage && (
                        <div className="alert alert-success">{successMessage}</div>
                    )}

                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                        <div className="tab-content">
                            <form onSubmit={handleUpdateProfile}>
                                <div className="form-group">
                                    <label>Tên đăng nhập</label>
                                    <input
                                        type="text"
                                        value={user.username}
                                        disabled
                                        className="form-control disabled"
                                    />
                                    <small>Không thể thay đổi tên đăng nhập</small>
                                </div>

                                <div className="form-group">
                                    <label>Họ và tên *</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={profileData.fullName}
                                        onChange={handleProfileChange}
                                        className="form-control"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        className="form-control"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Số điện thoại *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleProfileChange}
                                        className="form-control"
                                        placeholder="Nhập 10-20 chữ số"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === "security" && (
                        <div className="tab-content">
                            <form onSubmit={handleChangePassword}>
                                <h3>Đổi mật khẩu</h3>

                                <div className="form-group">
                                    <label>Mật khẩu hiện tại *</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        className="form-control"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Mật khẩu mới *</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        className="form-control"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Xác nhận mật khẩu mới *</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        className="form-control"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
