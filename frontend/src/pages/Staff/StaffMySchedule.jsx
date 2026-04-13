import { useEffect, useMemo, useState } from "react";
import { staffSchedulingStaffApi } from "../../api/staffSchedulingApi";
import { useAuth } from "../../contexts/AuthContext";
import "./StaffMySchedule.css";

const formatDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDateOnly = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const statusLabels = {
    DRAFT: "Nháp",
    PUBLISHED: "Chờ phản hồi",
    CONFIRMED: "Đã xác nhận",
    REJECTED: "Đã từ chối",
    ABSENT: "Vắng mặt",
};

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

export default function StaffMySchedule() {
    const { user } = useAuth();
    const [fromDate, setFromDate] = useState(formatDate(new Date()));
    const [toDate, setToDate] = useState(formatDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)));
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionKey, setActionKey] = useState("");

    const loadSchedule = async (nextFrom = fromDate, nextTo = toDate) => {
        try {
            setLoading(true);
            setError("");
            const response = await staffSchedulingStaffApi.getMySchedule(nextFrom, nextTo);
            const raw = response.data;
            setAssignments(
                Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.assignments)
                        ? raw.assignments
                        : []
            );
        } catch (err) {
            setError(getErrorMessage(err, "Không tải được lịch làm việc của bạn."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedule(fromDate, toDate);
    }, [fromDate, toDate]);

    const groupedAssignments = useMemo(() => {
        return assignments.reduce((groups, item) => {
            const key = item.shiftStart?.slice(0, 10) || "unknown";
            groups[key] = groups[key] || [];
            groups[key].push(item);
            return groups;
        }, {});
    }, [assignments]);

    const summary = useMemo(() => ({
        total: assignments.length,
        confirmed: assignments.filter((item) => item.status === "CONFIRMED").length,
        pending: assignments.filter((item) => item.status === "PUBLISHED").length,
        rejected: assignments.filter((item) => item.status === "REJECTED").length,
    }), [assignments]);

    const nextPendingAssignment = useMemo(() => {
        return assignments
            .filter((item) => item.status === "PUBLISHED")
            .sort((a, b) => new Date(a.shiftStart) - new Date(b.shiftStart))[0] || null;
    }, [assignments]);

    const handleReload = async (event) => {
        event.preventDefault();
        await loadSchedule(fromDate, toDate);
    };

    const handleConfirm = async (assignmentId) => {
        try {
            setActionKey(`confirm-${assignmentId}`);
            setError("");
            setSuccess("");
            await staffSchedulingStaffApi.confirmAssignment(assignmentId);
            setSuccess("Đã xác nhận ca làm thành công.");
            await loadSchedule(fromDate, toDate);
        } catch (err) {
            setError(getErrorMessage(err, "Không thể xác nhận ca làm."));
        } finally {
            setActionKey("");
        }
    };

    const handleReject = async (assignmentId) => {
        const reason = window.prompt("Nhập lý do từ chối ca (có thể bỏ trống):", "");
        if (reason === null) return;

        try {
            setActionKey(`reject-${assignmentId}`);
            setError("");
            setSuccess("");
            await staffSchedulingStaffApi.rejectAssignment(assignmentId, { reason });
            setSuccess("Đã gửi phản hồi từ chối ca làm.");
            await loadSchedule(fromDate, toDate);
        } catch (err) {
            setError(getErrorMessage(err, "Không thể từ chối ca làm."));
        } finally {
            setActionKey("");
        }
    };

    return (
        <div className="staff-my-schedule-page">
            <div className="staff-my-schedule-hero">
                <div>
                    <div className="staff-my-schedule-kicker">Lịch làm việc cá nhân</div>
                    <h1>Xin chào {user?.fullName || user?.username}</h1>
                    <p>
                        Đây là lịch làm việc theo ca của bạn. Hãy xem kỹ vị trí được phân công,
                        thời gian bắt đầu kết thúc và xác nhận khi đã nắm được lịch.
                    </p>
                </div>

                <form className="staff-my-schedule-filter" onSubmit={handleReload}>
                    <label>
                        Từ ngày
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </label>
                    <label>
                        Đến ngày
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </label>
                    <button type="submit" disabled={loading}>
                        {loading ? "Đang tải..." : "Xem lịch"}
                    </button>
                </form>
            </div>

            <div className="staff-my-schedule-stats">
                <div className="staff-my-schedule-stat-card highlight">
                    <span>Tổng ca</span>
                    <strong>{summary.total}</strong>
                </div>
                <div className="staff-my-schedule-stat-card">
                    <span>Chờ phản hồi</span>
                    <strong>{summary.pending}</strong>
                </div>
                <div className="staff-my-schedule-stat-card">
                    <span>Đã xác nhận</span>
                    <strong>{summary.confirmed}</strong>
                </div>
                <div className="staff-my-schedule-stat-card">
                    <span>Đã từ chối</span>
                    <strong>{summary.rejected}</strong>
                </div>
            </div>

            {nextPendingAssignment && (
                <div className="staff-next-shift-card">
                    <span className="staff-next-shift-label">Ca gần nhất cần phản hồi</span>
                    <strong>{nextPendingAssignment.shiftName || nextPendingAssignment.shiftCode || "Ca làm việc"}</strong>
                    <div>
                        {formatDateTime(nextPendingAssignment.shiftStart)} - {formatDateTime(nextPendingAssignment.shiftEnd)}
                    </div>
                    <div className="staff-next-shift-sub">{nextPendingAssignment.assignedPosition}</div>
                </div>
            )}

            {error && <div className="staff-my-schedule-banner error">{error}</div>}
            {success && <div className="staff-my-schedule-banner success">{success}</div>}

            {loading ? (
                <div className="staff-my-schedule-panel">Đang tải lịch làm việc...</div>
            ) : assignments.length === 0 ? (
                <div className="staff-my-schedule-panel empty">
                    Hiện chưa có ca nào trong khoảng thời gian này. Nếu admin vừa publish lịch, hãy bấm xem lại sau.
                </div>
            ) : (
                Object.entries(groupedAssignments).map(([dateKey, items]) => (
                    <section className="staff-my-schedule-panel" key={dateKey}>
                        <div className="panel-header">
                            <h2>{formatDateOnly(`${dateKey}T00:00:00`)}</h2>
                            <span>{items.length} ca</span>
                        </div>

                        <div className="assignment-list">
                            {items.map((item) => (
                                <article className="assignment-card" key={item.id}>
                                    <div className="assignment-main">
                                        <div>
                                            <div className="assignment-role">{item.assignedPosition}</div>
                                            <h3>{item.shiftName || item.shiftCode || "Ca làm việc"}</h3>
                                            <p>{formatDateTime(item.shiftStart)} - {formatDateTime(item.shiftEnd)}</p>
                                            <div className="assignment-sub">
                                                Plan #{item.planId} · @{item.staffUsername}
                                            </div>
                                        </div>

                                        <span className={`assignment-status ${item.status?.toLowerCase() || ""}`}>
                                            {statusLabels[item.status] || item.status}
                                        </span>
                                    </div>

                                    <p className="assignment-note">
                                        {item.explanation || "Ca được hệ thống phân công dựa trên nhu cầu vận hành theo ca và vị trí làm việc của bạn."}
                                    </p>

                                    {item.respondedAt && (
                                        <div className="assignment-response-meta">
                                            Phản hồi lúc {formatDateTime(item.respondedAt)}
                                            {item.responseNote ? ` · Lý do: ${item.responseNote}` : ""}
                                        </div>
                                    )}

                                    {item.status === "PUBLISHED" && (
                                        <div className="assignment-actions">
                                            <button
                                                type="button"
                                                className="confirm-button"
                                                onClick={() => handleConfirm(item.id)}
                                                disabled={actionKey === `confirm-${item.id}` || actionKey === `reject-${item.id}`}
                                            >
                                                {actionKey === `confirm-${item.id}` ? "Đang xác nhận..." : "Xác nhận đã nhận ca"}
                                            </button>
                                            <button
                                                type="button"
                                                className="reject-button"
                                                onClick={() => handleReject(item.id)}
                                                disabled={actionKey === `confirm-${item.id}` || actionKey === `reject-${item.id}`}
                                            >
                                                {actionKey === `reject-${item.id}` ? "Đang gửi..." : "Từ chối ca"}
                                            </button>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}