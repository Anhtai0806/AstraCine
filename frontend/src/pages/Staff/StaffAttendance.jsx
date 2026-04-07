import { useEffect, useMemo, useState } from "react";
import { staffAttendanceApi } from "../../api/attendanceApi";
import { useAuth } from "../../contexts/AuthContext";
import "./StaffAttendance.css";

const formatDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ định vị GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });

export default function StaffAttendance() {
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState(formatDate(new Date()));
  const [toDate, setToDate] = useState(formatDate(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionKey, setActionKey] = useState("");

  const loadAttendance = async (nextFrom = fromDate, nextTo = toDate) => {
    try {
      setLoading(true);
      setError("");
      const response = await staffAttendanceApi.getMyAttendance(nextFrom, nextTo);
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu chấm công."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance(fromDate, toDate);
  }, [fromDate, toDate]);

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const key = item.businessDate || item.scheduledStart?.slice(0, 10) || "unknown";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [items]);

  const summary = useMemo(
    () => ({
      total: items.length,
      checkedIn: items.filter((item) => item.attendanceStatus === "CHECKED_IN").length,
      completed: items.filter((item) => item.attendanceStatus === "COMPLETED" || item.attendanceStatus === "ADJUSTED").length,
      absent: items.filter((item) => item.attendanceStatus === "ABSENT").length,
    }),
    [items]
  );

  const handleCheckIn = async (assignmentId) => {
    try {
      setActionKey(`in-${assignmentId}`);
      setError("");
      setSuccess("");

      const position = await getCurrentPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      await staffAttendanceApi.checkIn(assignmentId, latitude, longitude);
      setSuccess("Check-in GPS thành công.");
      await loadAttendance(fromDate, toDate);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể check-in GPS cho ca này."));
    } finally {
      setActionKey("");
    }
  };

  const handleCheckOut = async (assignmentId) => {
    try {
      setActionKey(`out-${assignmentId}`);
      setError("");
      setSuccess("");
      await staffAttendanceApi.checkOut(assignmentId);
      setSuccess("Check-out thành công.");
      await loadAttendance(fromDate, toDate);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể check-out cho ca này."));
    } finally {
      setActionKey("");
    }
  };

  return (
    <div className="staff-attendance-page">
      <div className="staff-attendance-hero">
        <div>
          <div className="staff-attendance-kicker">Attendance</div>
          <h1>Chấm công ca làm của {user?.fullName || user?.username}</h1>
          <p>
            Check-in GPS là bắt buộc. Quá 15 phút chưa check-in thì hệ thống tự đánh vắng.
            Dữ liệu attendance thực tế sẽ được dùng để tính payroll.
          </p>
        </div>
        <div className="staff-attendance-filter">
          <label>
            Từ ngày
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            Đến ngày
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="staff-attendance-stats">
        <div className="staff-attendance-stat-card highlight"><span>Tổng ca</span><strong>{summary.total}</strong></div>
        <div className="staff-attendance-stat-card"><span>Đang làm</span><strong>{summary.checkedIn}</strong></div>
        <div className="staff-attendance-stat-card"><span>Hoàn thành</span><strong>{summary.completed}</strong></div>
        <div className="staff-attendance-stat-card"><span>Vắng mặt</span><strong>{summary.absent}</strong></div>
      </div>

      {error && <div className="staff-attendance-banner error">{error}</div>}
      {success && <div className="staff-attendance-banner success">{success}</div>}

      {loading ? (
        <div className="staff-attendance-panel">Đang tải dữ liệu chấm công...</div>
      ) : items.length === 0 ? (
        <div className="staff-attendance-panel empty">Chưa có bản ghi chấm công trong khoảng thời gian này.</div>
      ) : (
        Object.entries(groupedItems).map(([dateKey, dateItems]) => (
          <section key={dateKey} className="staff-attendance-panel">
            <div className="panel-header">
              <h2>{formatDateOnly(`${dateKey}T00:00:00`)}</h2>
              <span>{dateItems.length} ca</span>
            </div>
            <div className="attendance-list">
              {dateItems.map((item) => (
                <article className="attendance-card" key={`${item.assignmentId}-${item.attendanceId || "new"}`}>
                  <div className="attendance-main">
                    <div>
                      <div className="attendance-role">{item.assignedPosition}</div>
                      <h3>{item.shiftName || item.shiftCode || "Ca làm việc"}</h3>
                      <p>{formatDateTime(item.scheduledStart)} - {formatDateTime(item.scheduledEnd)}</p>
                      <div className="attendance-sub">Check-in: {formatDateTime(item.checkInTime)} · Check-out: {formatDateTime(item.checkOutTime)}</div>
                    </div>
                    <span className={`attendance-status ${(item.attendanceStatus || "PENDING").toLowerCase()}`}>
                      {attendanceLabels[item.attendanceStatus] || item.attendanceStatus || attendanceLabels.PENDING}
                    </span>
                  </div>

                  <div className="attendance-metrics">
                    <span>Phút làm: <strong>{item.workedMinutes ?? 0}</strong></span>
                    <span>Đi muộn: <strong>{item.lateMinutes ?? 0}</strong></span>
                    <span>Về sớm: <strong>{item.earlyLeaveMinutes ?? 0}</strong></span>
                  </div>

                  {item.gpsVerified && (
                    <p className="attendance-note">
                      GPS hợp lệ · khoảng cách {Math.round(item.checkInDistanceMeters || 0)}m
                    </p>
                  )}

                  {item.autoMarkedAbsent && (
                    <p className="attendance-note">Tự động vắng do quá 15 phút chưa check-in.</p>
                  )}

                  {item.note && <p className="attendance-note">Ghi chú: {item.note}</p>}

                  <div className="attendance-actions">
                    <button
                      type="button"
                      className="primary"
                      disabled={!item.canCheckIn || actionKey === `in-${item.assignmentId}`}
                      onClick={() => handleCheckIn(item.assignmentId)}
                    >
                      {actionKey === `in-${item.assignmentId}` ? "Đang xử lý..." : "Check-in GPS"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!item.canCheckOut || actionKey === `out-${item.assignmentId}`}
                      onClick={() => handleCheckOut(item.assignmentId)}
                    >
                      {actionKey === `out-${item.assignmentId}` ? "Đang xử lý..." : "Check-out"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
