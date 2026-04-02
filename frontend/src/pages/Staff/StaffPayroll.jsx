import { useEffect, useMemo, useState } from "react";
import { staffPayrollApi } from "../../api/payrollApi";
import "./StaffPayroll.css";

const formatDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

export default function StaffPayroll() {
  const [fromDate, setFromDate] = useState(formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [toDate, setToDate] = useState(formatDate(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayroll = async (nextFrom = fromDate, nextTo = toDate) => {
    try {
      setLoading(true);
      setError("");
      const response = await staffPayrollApi.getMyPayroll(nextFrom, nextTo);
      setData(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được payroll của bạn."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayroll(fromDate, toDate); }, [fromDate, toDate]);

  const ratesText = useMemo(() => (data?.rates || []).map((item) => `${item.position}: ${formatMoney(item.hourlyRate)}/giờ`).join(" · "), [data]);

  return (
    <div className="staff-payroll-page">
      <div className="staff-payroll-hero">
        <div>
          <div className="staff-payroll-kicker">Payroll</div>
          <h1>Lương tạm tính theo lịch đã duyệt</h1>
          <p>Dùng để staff tự kiểm tra số ca, số phút làm và mức lương tạm tính trong kỳ.</p>
        </div>
        <div className="staff-payroll-filter">
          <label>Từ ngày<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label>Đến ngày<input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        </div>
      </div>

      {error && <div className="staff-payroll-banner error">{error}</div>}

      {loading ? (
        <div className="staff-payroll-panel">Đang tải payroll...</div>
      ) : !data ? (
        <div className="staff-payroll-panel empty">Không có dữ liệu payroll.</div>
      ) : (
        <>
          <div className="staff-payroll-stats">
            <div className="staff-payroll-stat-card highlight"><span>Tổng tiền</span><strong>{formatMoney(data.grossAmount)}</strong></div>
            <div className="staff-payroll-stat-card"><span>Tổng giờ</span><strong>{data.totalHours || 0}</strong></div>
            <div className="staff-payroll-stat-card"><span>Tổng phút</span><strong>{data.totalMinutes || 0}</strong></div>
            <div className="staff-payroll-stat-card"><span>Số assignment</span><strong>{data.assignmentCount || 0}</strong></div>
          </div>

          <section className="staff-payroll-panel">
            <div className="panel-header"><h2>Tóm tắt</h2></div>
            <p><strong>Nhân viên:</strong> {data.staffName} ({data.staffUsername})</p>
            <p><strong>Vị trí:</strong> {data.staffPosition || "—"}</p>
            <p><strong>Mức lương áp dụng:</strong> {ratesText || "Chưa có bảng giá"}</p>
            {data.note && <p><strong>Ghi chú:</strong> {data.note}</p>}
          </section>

          <section className="staff-payroll-panel">
            <div className="panel-header"><h2>Chi tiết từng ca</h2><span>{data.assignments?.length || 0} dòng</span></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Ngày</th><th>Ca</th><th>Thời gian</th><th>Phút công</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                </thead>
                <tbody>
                  {(data.assignments || []).map((item) => (
                    <tr key={item.assignmentId}>
                      <td>{item.businessDate}</td>
                      <td><strong>{item.shiftName || item.shiftCode || 'Ca làm'}</strong><div className="subtext">{item.assignedPosition} · {item.status}</div></td>
                      <td>{formatDateTime(item.shiftStart)} - {formatDateTime(item.shiftEnd)}</td>
                      <td>{item.workingMinutes || 0}</td>
                      <td>{formatMoney(item.hourlyRate)}</td>
                      <td>{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
