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

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export default function AdminAttendance() {
  const [businessDate, setBusinessDate] = useState(formatDate(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [adjustForm, setAdjustForm] = useState({ attendanceId: null, checkInTime: "", checkOutTime: "", note: "" });
  const [absentForm, setAbsentForm] = useState({ assignmentId: null, note: "" });

  const loadAttendance = async (date = businessDate) => {
    try {
      setLoading(true);
      setError("");
      const response = await adminAttendanceApi.getAttendanceByDate(date);
      setData(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu attendance."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(businessDate);
  }, [businessDate]);

  const stats = useMemo(() => ({
    total: data?.totalAssignments || 0,
    checkedIn: data?.checkedInCount || 0,
    completed: data?.completedCount || 0,
    absent: data?.absentCount || 0,
    pending: data?.pendingCount || 0,
  }), [data]);

  const handleOpenAdjust = (item) => {
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

    setAdjustForm({
      attendanceId: item.attendanceId,
      checkInTime: toDateTimeLocal(item.checkInTime || item.scheduledStart),
      checkOutTime: toDateTimeLocal(item.checkOutTime || item.scheduledEnd),
      note: item.note || "",
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
      setAdjustForm({ attendanceId: null, checkInTime: "", checkOutTime: "", note: "" });
      await loadAttendance(businessDate);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể điều chỉnh attendance."));
    } finally {
      setActionKey("");
    }
  };

  const handleMarkAbsent = async (assignmentId) => {
    const note = absentForm.assignmentId === assignmentId ? absentForm.note : "Vắng mặt theo xác nhận quản lý";
    try {
      setActionKey(`absent-${assignmentId}`);
      setError("");
      setSuccess("");
      await adminAttendanceApi.markAbsent(assignmentId, note);
      setSuccess("Đã đánh dấu vắng mặt.");
      setAbsentForm({ assignmentId: null, note: "" });
      await loadAttendance(businessDate);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể đánh dấu absent."));
    } finally {
      setActionKey("");
    }
  };

  return (
    <div className="admin-attendance-page">
      <div className="admin-attendance-header">
        <div>
          <div className="admin-attendance-kicker">Admin Operations</div>
          <h1>Chấm công staff theo ngày</h1>
          <p>Theo dõi ai đã check-in, ai hoàn thành ca và xử lý các trường hợp absent hoặc chỉnh công ngay trong ngày.</p>
        </div>
        <label className="admin-attendance-date-picker">
          Ngày làm việc
          <input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
        </label>
      </div>

      <div className="admin-attendance-stats">
        <div className="admin-attendance-stat-card highlight"><span>Tổng assignment</span><strong>{stats.total}</strong></div>
        <div className="admin-attendance-stat-card"><span>Checked-in</span><strong>{stats.checkedIn}</strong></div>
        <div className="admin-attendance-stat-card"><span>Hoàn thành</span><strong>{stats.completed}</strong></div>
        <div className="admin-attendance-stat-card"><span>Absent</span><strong>{stats.absent}</strong></div>
        <div className="admin-attendance-stat-card"><span>Pending</span><strong>{stats.pending}</strong></div>
      </div>

      {error && <div className="admin-attendance-banner error">{error}</div>}
      {success && <div className="admin-attendance-banner success">{success}</div>}

      <div className="admin-attendance-grid">
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
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={`${item.assignmentId}-${item.attendanceId || 'new'}`}>
                      <td>
                        <strong>{item.staffName || item.staffUsername}</strong>
                        <div className="subtext">{item.staffUsername} · {item.assignedPosition}</div>
                      </td>
                      <td>
                        <strong>{item.shiftName || item.shiftCode || 'Ca làm'}</strong>
                        <div className="subtext">{formatDateTime(item.scheduledStart)} - {formatDateTime(item.scheduledEnd)}</div>
                      </td>
                      <td>{formatDateTime(item.checkInTime)}</td>
                      <td>{formatDateTime(item.checkOutTime)}</td>
                      <td>{item.workedMinutes ?? 0}</td>
                      <td>
                        <span className={`attendance-chip ${(item.attendanceStatus || 'PENDING').toLowerCase()}`}>
                          {attendanceLabels[item.attendanceStatus] || item.attendanceStatus || attendanceLabels.PENDING}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" onClick={() => handleOpenAdjust(item)} disabled={!item.attendanceId}>Chỉnh công</button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => setAbsentForm({ assignmentId: item.assignmentId, note: item.note || "Vắng mặt theo xác nhận quản lý" })}
                          >
                            Vắng mặt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-attendance-panel">
          <div className="panel-header">
            <h2>Điều chỉnh attendance</h2>
            <span>{adjustForm.attendanceId ? `#${adjustForm.attendanceId}` : "Chưa chọn"}</span>
          </div>
          <form className="admin-attendance-form" onSubmit={handleAdjustSubmit}>
            <label>
              Check-in time
              <input type="datetime-local" value={adjustForm.checkInTime} onChange={(e) => setAdjustForm((prev) => ({ ...prev, checkInTime: e.target.value }))} required />
            </label>
            <label>
              Check-out time
              <input type="datetime-local" value={adjustForm.checkOutTime} onChange={(e) => setAdjustForm((prev) => ({ ...prev, checkOutTime: e.target.value }))} required />
            </label>
            <label>
              Ghi chú
              <textarea rows="4" value={adjustForm.note} onChange={(e) => setAdjustForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Ví dụ: Staff quên check-out, manager xác nhận kết thúc lúc 22:15" />
            </label>
            <button type="submit" disabled={!adjustForm.attendanceId || Boolean(actionKey)}>
              {actionKey.startsWith("adjust-") ? "Đang lưu..." : "Lưu điều chỉnh"}
            </button>
          </form>

          <div className="panel-header minor">
            <h2>Đánh dấu absent</h2>
            <span>{absentForm.assignmentId ? `Assignment #${absentForm.assignmentId}` : "Chưa chọn"}</span>
          </div>
          <div className="admin-attendance-form">
            <label>
              Ghi chú absent
              <textarea rows="4" value={absentForm.note} onChange={(e) => setAbsentForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Ví dụ: Nhân viên xin nghỉ đột xuất, đã có người thay ca." />
            </label>
            <button type="button" className="danger" disabled={!absentForm.assignmentId || Boolean(actionKey)} onClick={() => handleMarkAbsent(absentForm.assignmentId)}>
              {actionKey.startsWith("absent-") ? "Đang cập nhật..." : "Xác nhận vắng mặt"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
