import { useEffect, useMemo, useState } from "react";
import { userManagementAPI } from "../../api/adminApi";
import "./AdminStaffManagement.css";

const statusLabels = {
    AVAILABLE: "Tài khoản trắng",
    ASSIGNED: "Đang sử dụng",
    APPROVED: "Đã duyệt",
    PENDING: "Chờ duyệt",
    REJECTED: "Từ chối",
    REVOKED: "Đã thu hồi",
    NONE: "Không đăng ký",
};

const positionLabels = {
    COUNTER: "Bán vé tại quầy",
    CHECKIN: "Soát vé",
    CONCESSION: "Bắp nước / quầy combo",
    MULTI: "Đa nhiệm",
};

const staffPositions = ["", "COUNTER", "CHECKIN", "CONCESSION", "MULTI"];

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN");
}

function maskPassword(password) {
    if (!password) return "Nhân viên đã đổi mật khẩu";
    return password;
}

function AdminStaffManagement() {
    const [users, setUsers] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [actionLoadingKey, setActionLoadingKey] = useState(null);
    const [userPositions, setUserPositions] = useState({});
    const [latestIssuedAccount, setLatestIssuedAccount] = useState(null);

    const fetchUsers = async (search = "") => {
        try {
            setLoading(true);
            setError("");

            const userRes = await userManagementAPI.getAll(search.trim());
            const nextUsers = Array.isArray(userRes.data) ? userRes.data : [];
            setUsers(nextUsers);

            setUserPositions((prev) => {
                const next = { ...prev };
                nextUsers.forEach((user) => {
                    next[user.id] = user.staffPosition || next[user.id] || "";
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
        fetchUsers();
    }, []);

    const managedUsers = useMemo(() => {
        return users.filter((user) => user.staff && !(user.roles || []).includes("ROLE_ADMIN"));
    }, [users]);

    const stats = useMemo(() => ({
        activeStaff: managedUsers.filter((user) => !user.blankStaffAccount).length,
        blankStaff: managedUsers.filter((user) => user.blankStaffAccount).length,
        hiddenPassword: managedUsers.filter((user) => !user.staffTemporaryPassword).length,
        totalStaff: managedUsers.length,
    }), [managedUsers]);

    const handleSearch = async (e) => {
        e.preventDefault();
        await fetchUsers(keyword);
    };

    const handleAutoCreate = async () => {
        const confirmed = window.confirm("Tạo ngay một tài khoản staff trắng với username theo mẫu và mật khẩu ngẫu nhiên?");
        if (!confirmed) return;

        try {
            setActionLoadingKey("create-auto");
            setError("");
            const response = await userManagementAPI.createAutoStaffAccount();
            const createdUser = response.data;
            setLatestIssuedAccount(createdUser);
            setSuccessMessage(`Đã tạo ${createdUser.username}. Hãy sao chép mật khẩu để cấp cho nhân viên.`);
            await fetchUsers(keyword);
        } catch (err) {
            setError(err.response?.data?.message || "Tạo tài khoản staff thất bại.");
        } finally {
            setActionLoadingKey(null);
        }
    };

    const handleUserAction = async (userId, action) => {
        const isRevoke = action === "REVOKE";
        const actionLabel = isRevoke
            ? "thu hồi nhân viên này và reset tài khoản về trạng thái trắng"
            : "cập nhật vị trí nhân viên";

        const confirmed = window.confirm(`Bạn có chắc muốn ${actionLabel} không?`);
        if (!confirmed) return;

        try {
            setActionLoadingKey(`user-${userId}`);
            setError("");
            const payload = {
                action,
                staffPosition: isRevoke ? null : userPositions[userId] || null,
            };
            const response = await userManagementAPI.updateStaffRole(userId, payload);
            const updatedUser = response.data;

            if (isRevoke) {
                setLatestIssuedAccount(updatedUser);
                setSuccessMessage(`Đã thu hồi ${updatedUser.username} và cấp mật khẩu mới để tái sử dụng tài khoản.`);
            } else {
                setSuccessMessage(`Đã cập nhật vị trí cho ${updatedUser.username}.`);
            }

            await fetchUsers(keyword);
        } catch (err) {
            setError(err.response?.data?.message || "Cập nhật staff thất bại.");
        } finally {
            setActionLoadingKey(null);
        }
    };

    const copyCredential = async (value, label) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setSuccessMessage(`Đã sao chép ${label}.`);
        } catch {
            setError(`Không sao chép được ${label}.`);
        }
    };

    return (
        <div className="admin-staff-page">
            <div className="admin-staff-header">
                <div>
                    <div className="admin-staff-kicker">Quản lý nhân sự quầy</div>
                    <h1>Tài khoản staff cấp sẵn</h1>
                    <p>
                        Admin chỉ cần bấm tạo tài khoản staff. Hệ thống sẽ tự sinh username theo mẫu
                        <strong> staff01, staff02...</strong> và tạo mật khẩu ngẫu nhiên đủ mạnh.
                        Khi thu hồi, tài khoản được xóa hồ sơ cá nhân và cấp lại mật khẩu mới để tái sử dụng an toàn.
                    </p>
                </div>
                <div className="admin-staff-header-actions">
                    <button
                        type="button"
                        className="admin-primary-button"
                        disabled={actionLoadingKey === "create-auto"}
                        onClick={handleAutoCreate}
                    >
                        {actionLoadingKey === "create-auto" ? "Đang tạo..." : "+ Tạo tài khoản staff"}
                    </button>
                </div>
            </div>

            <div className="admin-staff-stats">
                <div className="admin-staff-stat-card highlight">
                    <span>Tổng tài khoản staff</span>
                    <strong>{stats.totalStaff}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Tài khoản trắng</span>
                    <strong>{stats.blankStaff}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Đang sử dụng</span>
                    <strong>{stats.activeStaff}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Đã đổi mật khẩu riêng</span>
                    <strong>{stats.hiddenPassword}</strong>
                </div>
            </div>

            {latestIssuedAccount && (
                <div className="admin-staff-credential-card">
                    <div>
                        <div className="admin-staff-kicker">Thông tin cấp gần nhất</div>
                        <h2>{latestIssuedAccount.username}</h2>
                        <p>
                            Mật khẩu hiện hành: <strong>{latestIssuedAccount.staffTemporaryPassword || "Nhân viên đã đổi mật khẩu"}</strong>
                        </p>
                        <small>
                            Cấp lúc: {formatDateTime(latestIssuedAccount.staffCredentialsIssuedAt || latestIssuedAccount.updatedAt)}
                        </small>
                    </div>
                    <div className="admin-credential-actions">
                        <button type="button" onClick={() => copyCredential(latestIssuedAccount.username, "username")}>Sao chép username</button>
                        <button
                            type="button"
                            className="secondary"
                            disabled={!latestIssuedAccount.staffTemporaryPassword}
                            onClick={() => copyCredential(latestIssuedAccount.staffTemporaryPassword, "mật khẩu")}
                        >
                            Sao chép mật khẩu
                        </button>
                    </div>
                </div>
            )}

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
            {successMessage && <div className="admin-staff-alert success">✅ {successMessage}</div>}
            {loading && <div className="admin-staff-alert">Đang tải dữ liệu...</div>}

            {!loading && (
                <div className="admin-staff-table-wrapper">
                    <table className="admin-staff-table">
                        <thead>
                        <tr>
                            <th>Tài khoản</th>
                            <th>Hồ sơ cá nhân</th>
                            <th>Vị trí</th>
                            <th>Mật khẩu cấp gần nhất</th>
                            <th>Trạng thái</th>
                            <th>Cấp / reset lúc</th>
                            <th>Hành động</th>
                        </tr>
                        </thead>
                        <tbody>
                        {managedUsers.length === 0 && (
                            <tr>
                                <td colSpan="7">Chưa có tài khoản STAFF nào.</td>
                            </tr>
                        )}

                        {managedUsers.map((user) => {
                            const isBusy = actionLoadingKey === `user-${user.id}`;
                            const statusValue = statusLabels[user.staffApplicationStatus] || user.staffApplicationStatus || "—";
                            const currentPosition = userPositions[user.id] ?? user.staffPosition ?? "";

                            return (
                                <tr key={user.id}>
                                    <td>
                                        <div className="admin-staff-user-cell">
                                            <strong>@{user.username}</strong>
                                            <span>{user.enabled ? "Đang bật" : "Đã tắt"} · {user.status}</span>
                                            <small>ID: {user.id}</small>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-staff-user-cell compact">
                                            <strong>{user.fullName || "Chưa có hồ sơ cá nhân"}</strong>
                                            <span>{user.email || "—"}</span>
                                            <span>{user.phone || "—"}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-position-stack">
                                            <select
                                                value={currentPosition}
                                                onChange={(e) =>
                                                    setUserPositions((prev) => ({
                                                        ...prev,
                                                        [user.id]: e.target.value,
                                                    }))
                                                }
                                            >
                                                {staffPositions.map((position) => (
                                                    <option key={position || "blank"} value={position}>
                                                        {position ? positionLabels[position] : "Chưa gán vị trí"}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                type="button"
                                                className="secondary"
                                                disabled={isBusy}
                                                onClick={() => handleUserAction(user.id, "UPDATE_POSITION")}
                                            >
                                                Cập nhật vị trí
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-password-box">
                                            <code>{maskPassword(user.staffTemporaryPassword)}</code>
                                            <button
                                                type="button"
                                                className="secondary small"
                                                disabled={!user.staffTemporaryPassword}
                                                onClick={() => copyCredential(user.staffTemporaryPassword, `mật khẩu của ${user.username}`)}
                                            >
                                                Sao chép
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-application-status status-${(user.staffApplicationStatus || "NONE").toLowerCase()}`}>
                                            {statusValue}
                                        </span>
                                        {user.blankStaffAccount && <small className="admin-inline-note">Chờ nhân viên tự nhập hồ sơ</small>}
                                    </td>
                                    <td>{formatDateTime(user.staffCredentialsIssuedAt || user.updatedAt || user.createdAt)}</td>
                                    <td>
                                        <div className="admin-staff-actions">
                                            <button
                                                type="button"
                                                className="danger"
                                                disabled={isBusy}
                                                onClick={() => handleUserAction(user.id, "REVOKE")}
                                            >
                                                Thu hồi & reset mật khẩu
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminStaffManagement;
