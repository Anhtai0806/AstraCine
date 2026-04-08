import { useEffect, useMemo, useState } from "react";
import { staffSchedulingAdminApi } from "../../api/staffSchedulingApi";
import "./AdminStaffScheduling.css";

const formatDateValue = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const formatRange = (start, end) => `${formatDateTime(start)} - ${formatDateTime(end)}`;

const planStatusLabel = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã phát hành",
  ARCHIVED: "Lưu trữ",
};

const assignmentStatusLabel = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã phát hành",
  CONFIRMED: "Đã xác nhận",
  ABSENT: "Vắng mặt",
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export default function AdminStaffScheduling() {
  const [businessDate, setBusinessDate] = useState(formatDateValue(new Date()));
  const [requiredStaffPerShift, setRequiredStaffPerShift] = useState(5);
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionKey, setActionKey] = useState("");

  const loadPage = async (date = businessDate) => {
    try {
      setLoading(true);
      setError("");
      const [planRes, assignmentRes] = await Promise.all([
        staffSchedulingAdminApi.getPlans(date),
        staffSchedulingAdminApi.getAssignments(date),
      ]);
      setPlans(Array.isArray(planRes.data) ? planRes.data : []);
      setAssignments(Array.isArray(assignmentRes.data) ? assignmentRes.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được dữ liệu xếp lịch staff."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(businessDate);
  }, [businessDate]);

  const stats = useMemo(() => {
    const publishedPlans = plans.filter((plan) => plan.status === "PUBLISHED").length;
    const confirmedAssignments = assignments.filter((item) => item.status === "CONFIRMED").length;
    const partTimeAssignments = assignments.filter((item) => (item.explanation || "").includes("PART_TIME")).length;
    return {
      plans: plans.length,
      publishedPlans,
      assignments: assignments.length,
      confirmedAssignments,
      partTimeAssignments,
    };
  }, [plans, assignments]);

  const latestDraftPlan = useMemo(
    () => plans.find((plan) => plan.status === "DRAFT") || null,
    [plans]
  );

  const handleGenerateSimplePlan = async () => {
    try {
      setActionKey("generate-simple-plan");
      setError("");
      setSuccess("");
      await staffSchedulingAdminApi.generateSimplePlan({
        businessDate,
        requiredStaffPerShift: Number(requiredStaffPerShift),
      });
      setSuccess("Đã tạo simple shift plan theo ca cố định.");
      await loadPage(businessDate);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể generate simple shift plan."));
    } finally {
      setActionKey("");
    }
  };

  const handlePublishPlan = async (planId) => {
    try {
      setActionKey(`publish-${planId}`);
      setError("");
      setSuccess("");
      await staffSchedulingAdminApi.publishPlan(planId);
      setSuccess("Đã publish lịch làm việc cho staff.");
      await loadPage(businessDate);
    } catch (err) {
      setError(getErrorMessage(err, "Không thể publish plan."));
    } finally {
      setActionKey("");
    }
  };

  const handleReadExplanation = async (assignmentId) => {
    try {
      setActionKey(`explain-${assignmentId}`);
      setError("");
      const response = await staffSchedulingAdminApi.getAssignmentExplanation(assignmentId);
      setSelectedExplanation(response.data);
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được giải thích phân ca."));
    } finally {
      setActionKey("");
    }
  };

  return (
    <div className="staff-scheduling-page">
      <div className="staff-scheduling-header">
        <div>
          <div className="staff-scheduling-kicker">Admin Operations</div>
          <h1>Xếp lịch staff theo ca cố định</h1>
          <p>
            Mỗi ca làm có 4-6 nhân viên. Ngày thường ưu tiên full-time, part-time chỉ bù thiếu.
            Vào dịp lễ lớn, hệ thống sẽ cố gắng ép 1-2 part-time mỗi ca nếu có sẵn nhân sự hợp lệ.
          </p>
        </div>
        <div className="staff-scheduling-toolbar">
          <label>
            Ngày làm việc
            <input
              type="date"
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
            />
          </label>
          <label>
            Nhân viên / ca
            <select value={requiredStaffPerShift} onChange={(e) => setRequiredStaffPerShift(Number(e.target.value))}>
              <option value={4}>4 người</option>
              <option value={5}>5 người</option>
              <option value={6}>6 người</option>
            </select>
          </label>
          <button
            type="button"
            className="primary"
            onClick={handleGenerateSimplePlan}
            disabled={actionKey === "generate-simple-plan"}
          >
            {actionKey === "generate-simple-plan" ? "Đang tạo..." : "Generate simple plan"}
          </button>
          {latestDraftPlan && (
            <button
              type="button"
              className="success"
              onClick={() => handlePublishPlan(latestDraftPlan.id)}
              disabled={actionKey === `publish-${latestDraftPlan.id}`}
            >
              {actionKey === `publish-${latestDraftPlan.id}` ? "Đang publish..." : "Publish plan mới nhất"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="staff-scheduling-banner error">{error}</div>}
      {success && <div className="staff-scheduling-banner success">{success}</div>}

      <div className="staff-scheduling-stats">
        <div className="staff-scheduling-stat-card highlight">
          <span>Plans</span>
          <strong>{stats.plans}</strong>
        </div>
        <div className="staff-scheduling-stat-card">
          <span>Published</span>
          <strong>{stats.publishedPlans}</strong>
        </div>
        <div className="staff-scheduling-stat-card">
          <span>Assignments</span>
          <strong>{stats.assignments}</strong>
        </div>
        <div className="staff-scheduling-stat-card">
          <span>Confirmed</span>
          <strong>{stats.confirmedAssignments}</strong>
        </div>
        <div className="staff-scheduling-stat-card">
          <span>Part-time được xếp</span>
          <strong>{stats.partTimeAssignments}</strong>
        </div>
      </div>

      <div className="staff-scheduling-grid">
        <section className="staff-scheduling-panel">
          <div className="panel-header">
            <h2>Kế hoạch lịch</h2>
            <span>{plans.length} plan</span>
          </div>
          {loading ? (
            <div className="empty-state">Đang tải dữ liệu...</div>
          ) : plans.length === 0 ? (
            <div className="empty-state">Chưa có kế hoạch ca cho ngày này.</div>
          ) : (
            <div className="plan-list">
              {plans.map((plan) => (
                <article key={plan.id} className={`plan-card ${plan.status?.toLowerCase() || ""}`}>
                  <div className="plan-card-top">
                    <div>
                      <h3>Plan #{plan.id}</h3>
                      <p>{plan.note || "Simple shift plan"}</p>
                    </div>
                    <span className={`plan-badge ${plan.status?.toLowerCase() || ""}`}>
                      {planStatusLabel[plan.status] || plan.status}
                    </span>
                  </div>
                  <div className="plan-meta">
                    <span>Generated: {formatDateTime(plan.generatedAt)}</span>
                    <span>Assignments: {plan.assignmentCount || 0}</span>
                  </div>
                  {plan.status === "DRAFT" && (
                    <button
                      type="button"
                      className="success outline"
                      onClick={() => handlePublishPlan(plan.id)}
                      disabled={actionKey === `publish-${plan.id}`}
                    >
                      {actionKey === `publish-${plan.id}` ? "Đang publish..." : "Publish plan này"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="staff-scheduling-panel full-width">
        <div className="panel-header">
          <h2>Phân ca nhân viên</h2>
          <span>{assignments.length} assignment</span>
        </div>
        {assignments.length === 0 ? (
          <div className="empty-state">Chưa có phân công nào cho ngày này.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Vị trí</th>
                  <th>Ca</th>
                  <th>Khung giờ</th>
                  <th>Trạng thái</th>
                  <th>Giải thích</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="staff-name">{item.staffName || item.staffUsername}</div>
                      <div className="staff-sub">@{item.staffUsername}</div>
                    </td>
                    <td>{item.assignedPosition}</td>
                    <td>
                      <div className="staff-name">{item.shiftName || item.shiftCode || "—"}</div>
                      <div className="staff-sub">Plan #{item.planId}</div>
                    </td>
                    <td>{formatRange(item.shiftStart, item.shiftEnd)}</td>
                    <td>
                      <span className={`assignment-badge ${item.status?.toLowerCase() || ""}`}>
                        {assignmentStatusLabel[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleReadExplanation(item.id)}
                        disabled={actionKey === `explain-${item.id}`}
                      >
                        {actionKey === `explain-${item.id}` ? "Đang đọc..." : "Xem lý do"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedExplanation && (
        <div className="staff-scheduling-panel explanation-box">
          <div className="panel-header">
            <h2>Giải thích phân ca #{selectedExplanation.assignmentId}</h2>
            <button type="button" className="ghost" onClick={() => setSelectedExplanation(null)}>
              Đóng
            </button>
          </div>
          <p>{selectedExplanation.explanation || "Không có mô tả bổ sung."}</p>
        </div>
      )}
    </div>
  );
}
