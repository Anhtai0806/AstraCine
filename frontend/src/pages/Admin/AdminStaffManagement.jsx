import { useEffect, useMemo, useState } from "react";
import { staffApplicationAPI, userManagementAPI } from "../../api/adminApi";
import "./AdminStaffManagement.css";

const statusLabels = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    NONE: "Không đăng ký",
    REVOKED: "Đã thu hồi",
};

const positionLabels = {
    COUNTER: "Bán vé tại quầy",
    CHECKIN: "Soát vé",
    CONCESSION: "Bắp nước / quầy combo",
    MULTI: "Đa nhiệm",
};

const staffPositions = ["COUNTER", "CHECKIN", "CONCESSION", "MULTI"];

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN");
}

function AdminStaffManagement() {
    const [applications, setApplications] = useState([]);
    const [users, setUsers] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoadingKey, setActionLoadingKey] = useState(null);

    const [applicationPositions, setApplicationPositions] = useState({});
    const [userPositions, setUserPositions] = useState({});

    const fetchAll = async (search = "") => {
        try {
            setLoading(true);
            setError("");

            const [applicationRes, userRes] = await Promise.all([
                staffApplicationAPI.getAll(search.trim()),
                userManagementAPI.getAll(search.trim()),
            ]);

            const nextApplications = Array.isArray(applicationRes.data) ? applicationRes.data : [];
            const nextUsers = Array.isArray(userRes.data) ? userRes.data : [];

            setApplications(nextApplications);
            setUsers(nextUsers);

            setApplicationPositions((prev) => {
                const next = { ...prev };
                nextApplications.forEach((item) => {
                    if (!next[item.id]) {
                        next[item.id] = "COUNTER";
                    }
                });
                return next;
            });

            setUserPositions((prev) => {
                const next = { ...prev };
                nextUsers.forEach((user) => {
                    next[user.id] = user.staffPosition || next[user.id] || "COUNTER";
                });
                return next;
            });
        } catch (err) {
            setError(err.response?.data?.message || "Không tải được dữ liệu staff.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const managedUsers = useMemo(() => {
        return users.filter((user) => user.staff);
    }, [users]);

    const stats = useMemo(() => ({
        pendingApplications: applications.filter((item) => item.status === "PENDING").length,
        approvedApplications: applications.filter((item) => item.status === "APPROVED").length,
        activeStaff: managedUsers.length,
        totalUsers: users.length,
    }), [applications, managedUsers, users]);

    const handleSearch = async (e) => {
        e.preventDefault();
        await fetchAll(keyword);
    };

    const handleApplicationAction = async (applicationId, action) => {
        const actionLabel = action === "APPROVE"
            ? "duyệt và tạo tài khoản STAFF"
            : "từ chối yêu cầu này";

        const confirmed = window.confirm(`Bạn có chắc muốn ${actionLabel} không?`);
        if (!confirmed) return;

        try {
            setActionLoadingKey(`app-${applicationId}`);

            const payload = {
                action,
                staffPosition: action === "APPROVE" ? applicationPositions[applicationId] : null,
            };

            await staffApplicationAPI.handle(applicationId, payload);
            await fetchAll(keyword);
        } catch (err) {
            setError(err.response?.data?.message || "Xử lý yêu cầu thất bại.");
        } finally {
            setActionLoadingKey(null);
        }
    };

    const handleUserAction = async (userId, action) => {
        const actionLabel =
            action === "REVOKE" ? "thu hồi quyền STAFF" : "cập nhật vị trí nhân viên";

        const confirmed = window.confirm(`Bạn có chắc muốn ${actionLabel} không?`);
        if (!confirmed) return;

        try {
            setActionLoadingKey(`user-${userId}`);

            const payload = {
                action,
                staffPosition: action === "REVOKE" ? null : userPositions[userId],
            };

            await userManagementAPI.updateStaffRole(userId, payload);
            await fetchAll(keyword);
        } catch (err) {
            setError(err.response?.data?.message || "Cập nhật quyền staff thất bại.");
        } finally {
            setActionLoadingKey(null);
        }
    };

    return (
        <div className="admin-staff-page">
            <div className="admin-staff-header">
                <div>
                    <div className="admin-staff-kicker">Quản lý nhân sự quầy</div>
                    <h1>Quản lý yêu cầu tạo tài khoản staff</h1>
                    <p>
                        Admin duyệt tài khoản staff và gán luôn vị trí nghiệp vụ như bán vé, soát vé hoặc đa nhiệm.
                    </p>
                </div>
            </div>

            <div className="admin-staff-stats">
                <div className="admin-staff-stat-card highlight">
                    <span>Yêu cầu chờ duyệt</span>
                    <strong>{stats.pendingApplications}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Yêu cầu đã duyệt</span>
                    <strong>{stats.approvedApplications}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Đang là staff</span>
                    <strong>{stats.activeStaff}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Tổng tài khoản hệ thống</span>
                    <strong>{stats.totalUsers}</strong>
                </div>
            </div>

            <div className="admin-staff-toolbar">
                <form onSubmit={handleSearch} className="admin-staff-search">
                    <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Tìm theo username, họ tên, email, SĐT, vị trí..."
                    />
                    <button type="submit">Tìm kiếm</button>
                </form>
            </div>

            {error && <div className="admin-staff-alert error">⚠️ {error}</div>}
            {loading && <div className="admin-staff-alert">Đang tải dữ liệu...</div>}

            {!loading && (
                <>
                    <div className="admin-staff-header">
                        <div>
                            <div className="admin-staff-kicker">Request</div>
                            <h2 className="admin-section-title">Danh sách yêu cầu tạo tài khoản staff</h2>
                        </div>
                    </div>

                    <div className="admin-staff-table-wrapper">
                        <table className="admin-staff-table">
                            <thead>
                            <tr>
                                <th>Ứng viên</th>
                                <th>Liên hệ</th>
                                <th>Vị trí mong muốn</th>
                                <th>Vị trí được cấp</th>
                                <th>Trạng thái</th>
                                <th>Tạo lúc</th>
                                <th>Hành động</th>
                            </tr>
                            </thead>
                            <tbody>
                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan="7">Không có yêu cầu nào.</td>
                                </tr>
                            )}

                            {applications.map((item) => {
                                const isBusy = actionLoadingKey === `app-${item.id}`;
                                return (
                                    <tr key={item.id}>
                                        <td>
                                            <div className="admin-staff-user-cell">
                                                <strong>{item.fullName}</strong>
                                                <span>@{item.username}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="admin-staff-user-cell compact">
                                                <span>{item.email}</span>
                                                <span>{item.phone}</span>
                                            </div>
                                        </td>
                                        <td>{item.desiredPosition}</td>
                                        <td>
                                            {item.status === "PENDING" ? (
                                                <select
                                                    value={applicationPositions[item.id] || "COUNTER"}
                                                    onChange={(e) =>
                                                        setApplicationPositions((prev) => ({
                                                            ...prev,
                                                            [item.id]: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    {staffPositions.map((position) => (
                                                        <option key={position} value={position}>
                                                            {positionLabels[position]}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td>
                                                <span className={`admin-application-status status-${(item.status || "PENDING").toLowerCase()}`}>
                                                    {statusLabels[item.status] || item.status}
                                                </span>
                                        </td>
                                        <td>{formatDateTime(item.createdAt)}</td>
                                        <td>
                                            <div className="admin-staff-actions">
                                                {item.status === "PENDING" && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => handleApplicationAction(item.id, "APPROVE")}
                                                        >
                                                            Duyệt & tạo STAFF
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="secondary"
                                                            disabled={isBusy}
                                                            onClick={() => handleApplicationAction(item.id, "REJECT")}
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </>
                                                )}

                                                {item.status === "APPROVED" && (
                                                    <span className="admin-note">Đã tạo user ID: {item.createdUserId || "—"}</span>
                                                )}

                                                {item.status === "REJECTED" && (
                                                    <span className="admin-note">Yêu cầu đã bị từ chối</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    <div className="admin-staff-header">
                        <div>
                            <div className="admin-staff-kicker">User</div>
                            <h2 className="admin-section-title">Danh sách tài khoản STAFF hiện có</h2>
                        </div>
                    </div>

                    <div className="admin-staff-table-wrapper">
                        <table className="admin-staff-table">
                            <thead>
                            <tr>
                                <th>Tài khoản</th>
                                <th>Liên hệ</th>
                                <th>Vai trò</th>
                                <th>Position hiện tại</th>
                                <th>Nguyện vọng</th>
                                <th>Trạng thái đơn cũ</th>
                                <th>Tạo lúc</th>
                                <th>Hành động</th>
                            </tr>
                            </thead>
                            <tbody>
                            {managedUsers.length === 0 && (
                                <tr>
                                    <td colSpan="8">Không có tài khoản STAFF nào.</td>
                                </tr>
                            )}

                            {managedUsers.map((user) => {
                                const isBusy = actionLoadingKey === `user-${user.id}`;
                                const staffStatus = statusLabels[user.staffApplicationStatus] || user.staffApplicationStatus || "—";

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="admin-staff-user-cell">
                                                <strong>{user.fullName || user.username}</strong>
                                                <span>@{user.username}</span>
                                                <small>
                                                    {user.status} · {user.enabled ? "Đang bật" : "Đã tắt"}
                                                </small>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="admin-staff-user-cell compact">
                                                <span>{user.email || "—"}</span>
                                                <span>{user.phone || "—"}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="admin-role-badges">
                                                {(user.roles || []).map((role) => (
                                                    <span key={role} className={`admin-role-badge ${role === "ROLE_STAFF" ? "staff" : ""}`}>
                                                            {role}
                                                        </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="admin-position-stack">
                                                <select
                                                    value={userPositions[user.id] || user.staffPosition || "COUNTER"}
                                                    onChange={(e) =>
                                                        setUserPositions((prev) => ({
                                                            ...prev,
                                                            [user.id]: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    {staffPositions.map((position) => (
                                                        <option key={position} value={position}>
                                                            {positionLabels[position]}
                                                        </option>
                                                    ))}
                                                </select>

                                                <button
                                                    type="button"
                                                    className="secondary"
                                                    disabled={isBusy}
                                                    onClick={() => handleUserAction(user.id, "UPDATE_POSITION")}
                                                >
                                                    Cập nhật
                                                </button>
                                            </div>
                                        </td>
                                        <td>{user.desiredPosition || "—"}</td>
                                        <td>
                                                <span className={`admin-application-status status-${(user.staffApplicationStatus || "NONE").toLowerCase()}`}>
                                                    {staffStatus}
                                                </span>
                                        </td>
                                        <td>{formatDateTime(user.createdAt)}</td>
                                        <td>
                                            <div className="admin-staff-actions">
                                                <button
                                                    type="button"
                                                    className="danger"
                                                    disabled={isBusy}
                                                    onClick={() => handleUserAction(user.id, "REVOKE")}
                                                >
                                                    Thu hồi STAFF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminStaffManagement;