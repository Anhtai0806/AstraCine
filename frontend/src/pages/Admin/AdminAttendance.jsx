import { useEffect, useMemo, useState } from "react";
import { adminAttendanceApi } from "../../api/attendanceApi";
import "./AdminAttendance.css";

const formatDate = (value) => {
    const d = value instanceof Date ? value : new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const formatDateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
    });
};

const attendanceLabels = {
    PENDING: "Chưa chấm công",
    CHECKED_IN: "Đã check-in",
    COMPLETED: "Hoàn thành",
    ABSENT: "Vắng mặt",
    MISSED_CHECKOUT: "Quên check-out",
    ADJUSTED: "Đã điều chỉnh",
};

const disciplineLabels = {
    NORMAL: "Bình thường",
    WARNING: "Cảnh báo",
    ON_PROBATION: "Theo dõi",
    SUSPENDED_FROM_AUTO_ASSIGNMENT: "Ngừng auto-assign",
    LOCKED_BY_ATTENDANCE_REVIEW: "Chờ khóa / xét duyệt",
};

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

const toDateTimeLocal = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

export default function AdminAttendance() {
    const [businessDate, setBusinessDate] = useState(formatDate(new Date()));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionKey, setActionKey] = useState("");
    const [attendanceStatusMap, setAttendanceStatusMap] = useState({});
    const [selectedAttendanceStatus, setSelectedAttendanceStatus] = useState(null);

    const [adjustForm, setAdjustForm] = useState({
        attendanceId: null,
        checkInTime: "",
        checkOutTime: "",
        note: "",
    });

    const [absentForm, setAbsentForm] = useState({
        assignmentId: null,
        note: "",
    });

    const [actionModal, setActionModal] = useState({
        open: false,
        item: null,
        mode: null, // null | "menu" | "adjust" | "absent"
    });

    const loadAttendanceDisciplineStatuses = async (items) => {
        const staffIds = [...new Set((items || []).map((item) => item.staffUserId).filter(Boolean))];

        if (!staffIds.length) {
            setAttendanceStatusMap({});
            return;
        }

        const responses = await Promise.all(
            staffIds.map(async (staffUserId) => {
                try {
                    const response = await adminAttendanceApi.getStaffAttendanceStatus(staffUserId);
                    return response.data;
                } catch (err) {
                    return null;
                }
            })
        );

        const nextMap = {};
        responses.filter(Boolean).forEach((item) => {
            nextMap[item.staffUserId] = item;
        });
        setAttendanceStatusMap(nextMap);
    };

    const loadAttendance = async (date = businessDate) => {
        try {
            setLoading(true);
            setError("");
            const response = await adminAttendanceApi.getAttendanceByDate(date);
            const payload = response.data;
            setData(payload);
            await loadAttendanceDisciplineStatuses(payload?.items || []);
        } catch (err) {
            setError(getErrorMessage(err, "Không tải được dữ liệu attendance."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttendance(businessDate);
    }, [businessDate]);

    const stats = useMemo(
        () => ({
            total: data?.totalAssignments || 0,
            checkedIn: data?.checkedInCount || 0,
            completed: data?.completedCount || 0,
            absent: data?.absentCount || 0,
            pending: data?.pendingCount || 0,
            suspended: Object.values(attendanceStatusMap).filter(
                (item) => item?.attendanceDisciplineStatus === "SUSPENDED_FROM_AUTO_ASSIGNMENT"
            ).length,
        }),
        [data, attendanceStatusMap]
    );

    const closeActionModal = () => {
        if (actionKey) return;
        setActionModal({ open: false, item: null, mode: null });
        setAdjustForm({ attendanceId: null, checkInTime: "", checkOutTime: "", note: "" });
        setAbsentForm({ assignmentId: null, note: "" });
    };

    const openActionMenu = (item) => {
        setActionModal({
            open: true,
            item,
            mode: "menu",
        });
    };

    const openAdjustForm = (item) => {
        setAdjustForm({
            attendanceId: item.attendanceId,
            checkInTime: toDateTimeLocal(item.checkInTime || item.scheduledStart),
            checkOutTime: toDateTimeLocal(item.checkOutTime || item.scheduledEnd),
            note: item.note || "",
        });

        setActionModal({
            open: true,
            item,
            mode: "adjust",
        });
    };

    const openAbsentForm = (item) => {
        setAbsentForm({
            assignmentId: item.assignmentId,
            note: item.note || "Vắng mặt theo xác nhận quản lý",
        });

        setActionModal({
            open: true,
            item,
            mode: "absent",
        });
    };

    const handleAdjustSubmit = async (event) => {
        event.preventDefault();
        try {
            setActionKey(`adjust-${adjustForm.attendanceId}`);
            setError("");
            setSuccess("");

            await adminAttendanceApi.adjustAttendance(adjustForm.attendanceId, {
                checkInTime: adjustForm.checkInTime,
                checkOutTime: adjustForm.checkOutTime,
                note: adjustForm.note,
            });

            setSuccess("Đã điều chỉnh attendance.");
            closeActionModal();
            await loadAttendance(businessDate);
        } catch (err) {
            setError(getErrorMessage(err, "Không thể điều chỉnh attendance."));
        } finally {
            setActionKey("");
        }
    };

    const handleMarkAbsent = async (assignmentId, staffUserId) => {
        const note =
            absentForm.assignmentId === assignmentId
                ? absentForm.note
                : "Vắng mặt theo xác nhận quản lý";

        try {
            setActionKey(`absent-${assignmentId}`);
            setError("");
            setSuccess("");

            const response = await adminAttendanceApi.markAbsent(assignmentId, note);
            const payload = response?.data;

            if (payload?.discipline) {
                setSelectedAttendanceStatus(payload.discipline);
                setAttendanceStatusMap((prev) => ({
                    ...prev,
                    [payload.discipline.staffUserId]: payload.discipline,
                }));
            } else if (staffUserId) {
                const statusResponse = await adminAttendanceApi.getStaffAttendanceStatus(staffUserId);
                setSelectedAttendanceStatus(statusResponse.data);
                if (statusResponse?.data?.staffUserId) {
                    setAttendanceStatusMap((prev) => ({
                        ...prev,
                        [statusResponse.data.staffUserId]: statusResponse.data,
                    }));
                }
            }

            setSuccess("Đã đánh dấu vắng mặt và cập nhật kỷ luật attendance.");
            closeActionModal();
            await loadAttendance(businessDate);
        } catch (err) {
            setError(getErrorMessage(err, "Không thể đánh dấu absent."));
        } finally {
            setActionKey("");
        }
    };

    const selectedItem = actionModal.item;

    return (
        <div className="admin-attendance-page">
            <div className="admin-attendance-header">
                <div>
                    <div className="admin-attendance-kicker">Admin Operations</div>
                    <h1>Chấm công staff theo ngày</h1>
                    <p>
                        Theo dõi check-in, check-out, vắng mặt và trạng thái kỷ luật attendance
                        của nhân viên ngay trong màn chấm công.
                    </p>
                </div>
                <label className="admin-attendance-date-picker">
                    Ngày làm việc
                    <input
                        type="date"
                        value={businessDate}
                        onChange={(e) => setBusinessDate(e.target.value)}
                    />
                </label>
            </div>

            <div className="admin-attendance-stats">
                <div className="admin-attendance-stat-card highlight">
                    <span>Tổng assignment</span>
                    <strong>{stats.total}</strong>
                </div>
                <div className="admin-attendance-stat-card">
                    <span>Checked-in</span>
                    <strong>{stats.checkedIn}</strong>
                </div>
                <div className="admin-attendance-stat-card">
                    <span>Hoàn thành</span>
                    <strong>{stats.completed}</strong>
                </div>
                <div className="admin-attendance-stat-card">
                    <span>Absent</span>
                    <strong>{stats.absent}</strong>
                </div>
                <div className="admin-attendance-stat-card">
                    <span>Pending</span>
                    <strong>{stats.pending}</strong>
                </div>
                <div className="admin-attendance-stat-card">
                    <span>Ngừng auto-assign</span>
                    <strong>{stats.suspended}</strong>
                </div>
            </div>

            {error && <div className="admin-attendance-banner error">{error}</div>}
            {success && <div className="admin-attendance-banner success">{success}</div>}

            <div className="admin-attendance-layout">
                <section className="admin-attendance-panel wide">
                    <div className="panel-header">
                        <h2>Bảng attendance</h2>
                        <span>{data?.items?.length || 0} dòng</span>
                    </div>

                    {loading ? (
                        <div className="empty-state">Đang tải attendance...</div>
                    ) : !data?.items?.length ? (
                        <div className="empty-state">Chưa có assignment nào cho ngày này.</div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                <tr>
                                    <th>Nhân viên</th>
                                    <th>Ca làm</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Phút làm</th>
                                    <th>Attendance</th>
                                    <th>Kỷ luật</th>
                                    <th>Hành động</th>
                                </tr>
                                </thead>
                                <tbody>
                                {data.items.map((item) => {
                                    const discipline = attendanceStatusMap[item.staffUserId];
                                    return (
                                        <tr key={`${item.assignmentId}-${item.attendanceId || "new"}`}>
                                            <td>
                                                <strong>{item.staffName || item.staffUsername}</strong>
                                                <div className="subtext">
                                                    {item.staffUsername} · {item.assignedPosition}
                                                </div>
                                            </td>
                                            <td>
                                                <strong>{item.shiftName || item.shiftCode || "Ca làm"}</strong>
                                                <div className="subtext">
                                                    {formatDateTime(item.scheduledStart)} -{" "}
                                                    {formatDateTime(item.scheduledEnd)}
                                                </div>
                                            </td>
                                            <td>{formatDateTime(item.checkInTime)}</td>
                                            <td>{formatDateTime(item.checkOutTime)}</td>
                                            <td>{item.workedMinutes ?? 0}</td>
                                            <td>
                                                <span
                                                    className={`attendance-chip ${(
                                                        item.attendanceStatus || "PENDING"
                                                    ).toLowerCase()}`}
                                                >
                                                    {attendanceLabels[item.attendanceStatus] ||
                                                        item.attendanceStatus ||
                                                        attendanceLabels.PENDING}
                                                </span>
                                            </td>
                                            <td>
                                                {discipline ? (
                                                    <div className="discipline-cell">
                                                        <span
                                                            className={`discipline-chip ${(
                                                                discipline.attendanceDisciplineStatus || "NORMAL"
                                                            ).toLowerCase()}`}
                                                            onClick={() => setSelectedAttendanceStatus(discipline)}
                                                            role="button"
                                                            tabIndex={0}
                                                        >
                                                            {disciplineLabels[discipline.attendanceDisciplineStatus] ||
                                                                discipline.attendanceDisciplineStatus}
                                                        </span>
                                                        <small>{discipline.absentCount30d || 0} vắng / 30 ngày</small>
                                                    </div>
                                                ) : (
                                                    <span className="subtext">Chưa có dữ liệu</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        type="button"
                                                        className="primary"
                                                        onClick={() => openActionMenu(item)}
                                                    >
                                                        Hành động
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
                </section>

                <section className="admin-attendance-panel side">
                    <div className="panel-header">
                        <h2>Chi tiết kỷ luật attendance</h2>
                        <span>30 ngày gần nhất</span>
                    </div>

                    {selectedAttendanceStatus ? (
                        <div className="attendance-discipline-box">
                            <div className="attendance-discipline-row">
                                <span>Nhân viên</span>
                                <strong>{selectedAttendanceStatus.staffName || "—"}</strong>
                            </div>
                            <div className="attendance-discipline-row">
                                <span>Username</span>
                                <strong>{selectedAttendanceStatus.staffUsername || "—"}</strong>
                            </div>
                            <div className="attendance-discipline-row">
                                <span>Trạng thái</span>
                                <strong>
                                    {disciplineLabels[selectedAttendanceStatus.attendanceDisciplineStatus] ||
                                        selectedAttendanceStatus.attendanceDisciplineStatus}
                                </strong>
                            </div>
                            <div className="attendance-discipline-row">
                                <span>Vắng 30 ngày</span>
                                <strong>{selectedAttendanceStatus.absentCount30d || 0}</strong>
                            </div>

                            <div className="attendance-policy-note">
                                Quy tắc hiện tại: 1 lần vắng → Cảnh báo, 2 lần → Theo dõi,
                                3 lần → Ngừng auto-assign, từ 4 lần trở lên → Chờ admin xem xét khóa.
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">
                            Bấm vào badge kỷ luật của nhân viên để xem chi tiết.
                        </div>
                    )}
                </section>
            </div>

            {actionModal.open && (
                <div className="attendance-modal-overlay" onClick={closeActionModal}>
                    <div
                        className="attendance-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="attendance-modal-header">
                            <div>
                                <h2>
                                    {actionModal.mode === "menu" && "Hành động chấm công"}
                                    {actionModal.mode === "adjust" && "Điều chỉnh attendance"}
                                    {actionModal.mode === "absent" && "Đánh dấu vắng mặt"}
                                </h2>
                                {selectedItem && (
                                    <p>
                                        <strong>{selectedItem.staffName || selectedItem.staffUsername}</strong>
                                        {" · "}
                                        {selectedItem.shiftName || selectedItem.shiftCode || "Ca làm"}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="modal-close-button"
                                onClick={closeActionModal}
                                disabled={Boolean(actionKey)}
                            >
                                ✕
                            </button>
                        </div>

                        {actionModal.mode === "menu" && selectedItem && (
                            <div className="attendance-action-menu">
                                <button
                                    type="button"
                                    onClick={() => openAdjustForm(selectedItem)}
                                    disabled={!selectedItem.attendanceId}
                                >
                                    Chỉnh công
                                </button>
                                <button
                                    type="button"
                                    className="danger"
                                    onClick={() => openAbsentForm(selectedItem)}
                                >
                                    Đánh dấu vắng mặt
                                </button>
                            </div>
                        )}

                        {actionModal.mode === "adjust" && (
                            <form className="admin-attendance-form" onSubmit={handleAdjustSubmit}>
                                <label>
                                    Check-in time
                                    <input
                                        type="datetime-local"
                                        value={adjustForm.checkInTime}
                                        onChange={(e) =>
                                            setAdjustForm((prev) => ({
                                                ...prev,
                                                checkInTime: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Check-out time
                                    <input
                                        type="datetime-local"
                                        value={adjustForm.checkOutTime}
                                        onChange={(e) =>
                                            setAdjustForm((prev) => ({
                                                ...prev,
                                                checkOutTime: e.target.value,
                                            }))
                                        }
                                        required
                                    />
                                </label>

                                <label>
                                    Ghi chú
                                    <textarea
                                        rows="4"
                                        value={adjustForm.note}
                                        onChange={(e) =>
                                            setAdjustForm((prev) => ({
                                                ...prev,
                                                note: e.target.value,
                                            }))
                                        }
                                        placeholder="Ví dụ: Staff quên check-out, manager xác nhận kết thúc lúc 22:15"
                                    />
                                </label>

                                <div className="attendance-modal-actions">
                                    <button
                                        type="button"
                                        className="secondary"
                                        onClick={() =>
                                            setActionModal((prev) => ({ ...prev, mode: "menu" }))
                                        }
                                        disabled={Boolean(actionKey)}
                                    >
                                        Quay lại
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!adjustForm.attendanceId || Boolean(actionKey)}
                                    >
                                        {actionKey.startsWith("adjust-")
                                            ? "Đang lưu..."
                                            : "Lưu điều chỉnh"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {actionModal.mode === "absent" && (
                            <div className="admin-attendance-form">
                                <label>
                                    Ghi chú absent
                                    <textarea
                                        rows="4"
                                        value={absentForm.note}
                                        onChange={(e) =>
                                            setAbsentForm((prev) => ({
                                                ...prev,
                                                note: e.target.value,
                                            }))
                                        }
                                        placeholder="Ví dụ: Nhân viên xin nghỉ đột xuất, đã có người thay ca."
                                    />
                                </label>

                                <div className="attendance-modal-actions">
                                    <button
                                        type="button"
                                        className="secondary"
                                        onClick={() =>
                                            setActionModal((prev) => ({ ...prev, mode: "menu" }))
                                        }
                                        disabled={Boolean(actionKey)}
                                    >
                                        Quay lại
                                    </button>
                                    <button
                                        type="button"
                                        className="danger"
                                        disabled={!absentForm.assignmentId || Boolean(actionKey)}
                                        onClick={() =>
                                            handleMarkAbsent(
                                                absentForm.assignmentId,
                                                selectedItem?.staffUserId
                                            )
                                        }
                                    >
                                        {actionKey.startsWith("absent-")
                                            ? "Đang cập nhật..."
                                            : "Xác nhận vắng mặt"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}