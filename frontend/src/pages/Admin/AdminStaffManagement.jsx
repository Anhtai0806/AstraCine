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

const employmentTypeLabels = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
};

const staffPositions = ["", "COUNTER", "CHECKIN", "CONCESSION", "MULTI"];
const employmentTypes = ["FULL_TIME", "PART_TIME"];

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN");
}

function formatDateInput(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
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
    const [userEmploymentTypes, setUserEmploymentTypes] = useState({});
    const [userSeasonalOnly, setUserSeasonalOnly] = useState({});
    const [userSeasonalStart, setUserSeasonalStart] = useState({});
    const [userSeasonalEnd, setUserSeasonalEnd] = useState({});
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

            setUserEmploymentTypes((prev) => {
                const next = { ...prev };
                nextUsers.forEach((user) => {
                    next[user.id] = user.employmentType || next[user.id] || "FULL_TIME";
                });
                return next;
            });

            setUserSeasonalOnly((prev) => {
                const next = { ...prev };
                nextUsers.forEach((user) => {
                    next[user.id] = Boolean(user.seasonalOnly);
                });
                return next;
            });

            setUserSeasonalStart((prev) => {
                const next = { ...prev };
                nextUsers.forEach((user) => {
                    next[user.id] = formatDateInput(user.seasonalStartDate) || next[user.id] || "";
                });
                return next;
            });

            setUserSeasonalEnd((prev) => {
                const next = { ...prev };
                nextUsers.forEach((user) => {
                    next[user.id] = formatDateInput(user.seasonalEndDate) || next[user.id] || "";
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

    const stats = useMemo(
        () => ({
            activeStaff: managedUsers.filter((user) => !user.blankStaffAccount).length,
            blankStaff: managedUsers.filter((user) => user.blankStaffAccount).length,
            hiddenPassword: managedUsers.filter((user) => !user.staffTemporaryPassword).length,
            totalStaff: managedUsers.length,
            partTime: managedUsers.filter((user) => user.employmentType === "PART_TIME").length,
            seasonal: managedUsers.filter((user) => user.employmentType === "PART_TIME" && user.seasonalOnly).length,
        }),
        [managedUsers]
    );

    const handleSearch = async (e) => {
        e.preventDefault();
        await fetchUsers(keyword);
    };

    const resetSeasonalState = (userId) => {
        setUserSeasonalOnly((prev) => ({
            ...prev,
            [userId]: false,
        }));
        setUserSeasonalStart((prev) => ({
            ...prev,
            [userId]: "",
        }));
        setUserSeasonalEnd((prev) => ({
            ...prev,
            [userId]: "",
        }));
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
            : "cập nhật cấu hình staff";

        const confirmed = window.confirm(`Bạn có chắc muốn ${actionLabel} không?`);
        if (!confirmed) return;

        try {
            setActionLoadingKey(`user-${userId}`);
            setError("");

            const selectedEmploymentType = isRevoke ? null : userEmploymentTypes[userId] || "FULL_TIME";
            const allowSeasonal = selectedEmploymentType === "PART_TIME";

            const payload = {
                action,
                staffPosition: isRevoke ? null : userPositions[userId] || null,
                employmentType: selectedEmploymentType,
                seasonalOnly: isRevoke ? false : allowSeasonal ? !!userSeasonalOnly[userId] : false,
                seasonalStartDate: isRevoke ? null : allowSeasonal ? userSeasonalStart[userId] || null : null,
                seasonalEndDate: isRevoke ? null : allowSeasonal ? userSeasonalEnd[userId] || null : null,
            };

            const response = await userManagementAPI.updateStaffRole(userId, payload);
            const updatedUser = response.data;

            if (isRevoke) {
                setLatestIssuedAccount(updatedUser);
                setSuccessMessage(`Đã thu hồi ${updatedUser.username} và cấp mật khẩu mới để tái sử dụng tài khoản.`);
            } else {
                setSuccessMessage(`Đã cập nhật staff cho ${updatedUser.username}.`);
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
                        Admin có thể cấp tài khoản staff, phân loại full-time/part-time và đánh dấu seasonal cho
                        nhân viên thời vụ dịp lễ. Hệ thống sẽ dùng các cấu hình này để xếp ca đơn giản theo shift.
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
                    <span>Part-time</span>
                    <strong>{stats.partTime}</strong>
                </div>
                <div className="admin-staff-stat-card">
                    <span>Seasonal</span>
                    <strong>{stats.seasonal}</strong>
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
                        <button type="button" onClick={() => copyCredential(latestIssuedAccount.username, "username")}>
                            Sao chép username
                        </button>
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
                            <th>Vị trí & loại nhân sự</th>
                            <th>Mật khẩu cấp gần nhất</th>
                            <th>Trạng thái / vi phạm</th>
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
                            const currentEmploymentType = userEmploymentTypes[user.id] ?? user.employmentType ?? "FULL_TIME";
                            const currentSeasonal = Boolean(userSeasonalOnly[user.id] ?? user.seasonalOnly);
                            const showSeasonalControls = currentEmploymentType === "PART_TIME";

                            return (
                                <tr key={user.id}>
                                    <td>
                                        <div className="admin-staff-user-cell">
                                            <strong>@{user.username}</strong>
                                            <span>
                          {user.enabled ? "Đang bật" : "Đã tắt"} · {user.status}
                        </span>
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

                                            <select
                                                value={currentEmploymentType}
                                                onChange={(e) => {
                                                    const nextType = e.target.value;

                                                    setUserEmploymentTypes((prev) => ({
                                                        ...prev,
                                                        [user.id]: nextType,
                                                    }));

                                                    if (nextType === "FULL_TIME") {
                                                        resetSeasonalState(user.id);
                                                    }
                                                }}
                                            >
                                                {employmentTypes.map((type) => (
                                                    <option key={type} value={type}>
                                                        {employmentTypeLabels[type]}
                                                    </option>
                                                ))}
                                            </select>

                                            {showSeasonalControls && (
                                                <>
                                                    <label className="admin-inline-note">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentSeasonal}
                                                            onChange={(e) =>
                                                                setUserSeasonalOnly((prev) => ({
                                                                    ...prev,
                                                                    [user.id]: e.target.checked,
                                                                }))
                                                            }
                                                        />
                                                        Seasonal dịp lễ
                                                    </label>

                                                    <div className="admin-date-inline">
                                                        <input
                                                            type="date"
                                                            value={userSeasonalStart[user.id] || ""}
                                                            disabled={!currentSeasonal}
                                                            onChange={(e) =>
                                                                setUserSeasonalStart((prev) => ({
                                                                    ...prev,
                                                                    [user.id]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                        <input
                                                            type="date"
                                                            value={userSeasonalEnd[user.id] || ""}
                                                            disabled={!currentSeasonal}
                                                            onChange={(e) =>
                                                                setUserSeasonalEnd((prev) => ({
                                                                    ...prev,
                                                                    [user.id]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                className="secondary"
                                                disabled={isBusy}
                                                onClick={() => handleUserAction(user.id, "UPDATE_POSITION")}
                                            >
                                                Cập nhật staff
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
                      <span
                          className={`admin-application-status status-${(user.staffApplicationStatus || "NONE").toLowerCase()}`}
                      >
                        {statusValue}
                      </span>
                                        <div className="admin-inline-note">
                                            Loại: {employmentTypeLabels[user.employmentType] || user.employmentType || "—"}
                                        </div>
                                        <div className="admin-inline-note">Strike: {user.noShowStrikeCount ?? 0}</div>
                                        {user.employmentType === "PART_TIME" && user.seasonalOnly && (
                                            <div className="admin-inline-note">
                                                Seasonal: {formatDateInput(user.seasonalStartDate) || "?"} →{" "}
                                                {formatDateInput(user.seasonalEndDate) || "?"}
                                            </div>
                                        )}
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