import { useEffect, useMemo, useState } from "react";
import { adminPayrollApi } from "../../api/payrollApi";
import "./AdminPayroll.css";

const formatDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatMoney = (value) => Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

export default function AdminPayroll() {
  const [fromDate, setFromDate] = useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [summary, setSummary] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = async (nextFrom = fromDate, nextTo = toDate) => {
    try {
      setLoading(true);
      setError("");
      const response = await adminPayrollApi.getSummary(nextFrom, nextTo);
      setSummary(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được payroll summary."));
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (staffId) => {
    if (!staffId) return;
    try {
      setDetailLoading(true);
      setError("");
      const response = await adminPayrollApi.getStaffDetail(staffId, fromDate, toDate);
      setDetail(response.data);
      setSelectedStaffId(staffId);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được chi tiết payroll của staff."));
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(fromDate, toDate);
    setDetail(null);
    setSelectedStaffId(null);
  }, [fromDate, toDate]);

  const ratesText = useMemo(() => (summary?.rates || []).map((item) => `${item.position}: ${formatMoney(item.hourlyRate)}/giờ`).join(" · "), [summary]);

  return (
    <div className="admin-payroll-page">
      <div className="admin-payroll-header">
        <div>
          <div className="admin-payroll-kicker">Admin Operations</div>
          <h1>Payroll staff</h1>
          <p>Tổng hợp lương tạm tính theo lịch làm đã duyệt trong khoảng thời gian chọn.</p>
        </div>
        <div className="admin-payroll-filter">
          <label>Từ ngày<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label>Đến ngày<input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        </div>
      </div>

      {error && <div className="admin-payroll-banner error">{error}</div>}

      {loading ? (
        <div className="admin-payroll-panel">Đang tải payroll summary...</div>
      ) : !summary ? (
        <div className="admin-payroll-panel empty">Không có dữ liệu payroll.</div>
      ) : (
        <>
          <div className="admin-payroll-stats">
            <div className="admin-payroll-stat-card highlight"><span>Tổng tiền</span><strong>{formatMoney(summary.totalGrossAmount)}</strong></div>
            <div className="admin-payroll-stat-card"><span>Tổng giờ</span><strong>{summary.totalHours || 0}</strong></div>
            <div className="admin-payroll-stat-card"><span>Tổng phút</span><strong>{summary.totalMinutes || 0}</strong></div>
            <div className="admin-payroll-stat-card"><span>Tổng assignment</span><strong>{summary.totalAssignments || 0}</strong></div>
          </div>

          <div className="admin-payroll-grid">
            <section className="admin-payroll-panel wide">
              <div className="panel-header"><h2>Tổng hợp theo staff</h2><span>{summary.items?.length || 0} người</span></div>
              <p className="rates-text"><strong>Mức lương áp dụng:</strong> {ratesText || "Chưa có bảng giá"}</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Nhân viên</th><th>Vị trí</th><th>Ca</th><th>Phút</th><th>Giờ</th><th>Tổng tiền</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(summary.items || []).map((item) => (
                      <tr key={item.staffId} className={selectedStaffId === item.staffId ? "selected-row" : ""}>
                        <td><strong>{item.staffName}</strong><div className="subtext">{item.staffUsername}</div></td>
                        <td>{item.staffPosition || "—"}</td>
                        <td>{item.assignmentCount || 0}</td>
                        <td>{item.totalMinutes || 0}</td>
                        <td>{item.totalHours || 0}</td>
                        <td>{formatMoney(item.grossAmount)}</td>
                        <td><button type="button" onClick={() => loadDetail(item.staffId)}>{detailLoading && selectedStaffId === item.staffId ? "Đang tải..." : "Xem chi tiết"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-payroll-panel">
              <div className="panel-header"><h2>Chi tiết staff</h2><span>{detail ? `#${detail.staffId}` : "Chưa chọn"}</span></div>
              {!detail ? (
                <div className="empty-state">Chọn một staff ở bảng bên trái để xem chi tiết payroll.</div>
              ) : (
                <>
                  <p><strong>{detail.staffName}</strong> ({detail.staffUsername})</p>
                  <p><strong>Vị trí:</strong> {detail.staffPosition || "—"}</p>
                  <p><strong>Tổng tiền:</strong> {formatMoney(detail.grossAmount)}</p>
                  <p><strong>Tổng ca:</strong> {detail.assignmentCount || 0} · <strong>Tổng phút:</strong> {detail.totalMinutes || 0}</p>
                  {detail.note && <p><strong>Ghi chú:</strong> {detail.note}</p>}

                  <div className="table-wrap compact">
                    <table>
                      <thead><tr><th>Ca</th><th>Phút</th><th>Tiền</th></tr></thead>
                      <tbody>
                        {(detail.assignments || []).map((item) => (
                          <tr key={item.assignmentId}>
                            <td><strong>{item.shiftName || item.shiftCode || 'Ca làm'}</strong><div className="subtext">{formatDateTime(item.shiftStart)} - {formatDateTime(item.shiftEnd)}</div></td>
                            <td>{item.workingMinutes || 0}</td>
                            <td>{formatMoney(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
