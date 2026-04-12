import { useEffect, useMemo, useState } from "react";
import { staffSchedulingAdminApi } from "../../api/staffSchedulingApi";
import "./AdminStaffScheduling.css";

const MAX_STAFF_PER_SHIFT = 6;

const formatDateValue = (date) => {
    const d = date instanceof Date ? new Date(date) : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const addDays = (dateValue, amount) => {
    const base = new Date(dateValue);
    if (Number.isNaN(base.getTime())) return dateValue;
    base.setDate(base.getDate() + amount);
    return formatDateValue(base);
};

const getMonthRange = (dateValue) => {
    const base = new Date(dateValue);
    if (Number.isNaN(base.getTime())) {
        return { startDate: "", endDate: "" };
    }

    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);

    return {
        startDate: formatDateValue(start),
        endDate: formatDateValue(end),
    };
};

const countInclusiveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
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

const formatShortTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const planStatusLabel = {
    DRAFT: "Nháp",
    PUBLISHED: "Đã phát hành",
    ARCHIVED: "Lưu trữ",
};

const assignmentStatusLabel = {
    DRAFT: "Nháp",
    PUBLISHED: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    ABSENT: "Vắng mặt",
};

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

const getShiftTotal = (item) =>
    (item.counterRequired || 0) +
    (item.checkinRequired || 0) +
    (item.concessionRequired || 0) +
    (item.multiRequired || 0);

const getLoadLevel = (total) => {
    if (total >= 6) return { label: "Rất cao", className: "critical" };
    if (total >= 4) return { label: "Cao", className: "high" };
    if (total >= 2) return { label: "Trung bình", className: "medium" };
    return { label: "Nhẹ", className: "low" };
};

const buildRangeSummary = (startDate, endDate) => {
    const totalDays = countInclusiveDays(startDate, endDate);
    if (!totalDays) return "Chưa chọn khoảng ngày hợp lệ.";
    if (totalDays === 1) return `Đang thao tác trong ngày ${startDate}.`;
    return `Đang thao tác từ ${startDate} đến ${endDate} (${totalDays} ngày).`;
};

const buildDemandSuccessMessage = (data) => {
    const totalDays = data?.totalDaysRequested || 0;
    const successDays = data?.successDays || 0;
    const failedDays = data?.failedDays || 0;
    const totalDemandWindows = data?.totalDemandWindows || 0;

    let message = `Đã ước lượng nhu cầu cho ${successDays}/${totalDays} ngày`;
    if (totalDemandWindows > 0) {
        message += `, tạo ${totalDemandWindows} khung demand`;
    }
    if (failedDays > 0) {
        message += `. Có ${failedDays} ngày lỗi, xem chi tiết bên dưới.`;
    } else {
        message += ".";
    }

    return message;
};

const buildPlanSuccessMessage = (data) => {
    const totalDays = data?.totalDaysRequested || 0;
    const successDays = data?.successDays || 0;
    const failedDays = data?.failedDays || 0;
    const totalAssignments = data?.totalAssignments || 0;
    const totalPlans = Array.isArray(data?.plans) ? data.plans.length : 0;

    let message = `Đã tạo plan cho ${successDays}/${totalDays} ngày`;
    if (totalPlans > 0) {
        message += `, sinh ${totalPlans} plan`;
    }
    if (totalAssignments > 0) {
        message += ` và ${totalAssignments} assignment`;
    }
    if (failedDays > 0) {
        message += `. Có ${failedDays} ngày lỗi, xem chi tiết bên dưới.`;
    } else {
        message += ".";
    }

    return message;
};

export default function AdminStaffScheduling() {
    const today = formatDateValue(new Date());
    const currentMonthRange = getMonthRange(today);

    const [businessDate, setBusinessDate] = useState(today);
    const [rangeStartDate, setRangeStartDate] = useState(today);
    const [rangeEndDate, setRangeEndDate] = useState(currentMonthRange.endDate || today);
    const [windowMinutes, setWindowMinutes] = useState(30);
    const [demands, setDemands] = useState([]);
    const [plans, setPlans] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedExplanation, setSelectedExplanation] = useState(null);
    const [batchResult, setBatchResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionKey, setActionKey] = useState("");

    const loadPage = async (date = businessDate) => {
        try {
            setLoading(true);
            setError("");

            const [demandRes, planRes, assignmentRes] = await Promise.all([
                staffSchedulingAdminApi.getDemands(date),
                staffSchedulingAdminApi.getPlans(date),
                staffSchedulingAdminApi.getAssignments(date),
            ]);

            setDemands(Array.isArray(demandRes.data) ? demandRes.data : []);
            setPlans(Array.isArray(planRes.data) ? planRes.data : []);
            setAssignments(Array.isArray(assignmentRes.data) ? assignmentRes.data : []);
        } catch (err) {
            setError(getErrorMessage(err, "Không tải được dữ liệu phân ca staff."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPage(businessDate);
    }, [businessDate]);

    const enrichedDemands = useMemo(() => {
        return demands.map((item) => {
            const total = getShiftTotal(item);
            const loadLevel = getLoadLevel(total);
            const ratio = Math.min((total / MAX_STAFF_PER_SHIFT) * 100, 100);

            return {
                ...item,
                totalRequired: total,
                loadLevel,
                ratio,
            };
        });
    }, [demands]);

    const latestDraftPlan = useMemo(
        () => plans.find((plan) => plan.status === "DRAFT") || null,
        [plans]
    );

    const selectedRangeDays = useMemo(
        () => countInclusiveDays(rangeStartDate, rangeEndDate),
        [rangeStartDate, rangeEndDate]
    );

    const stats = useMemo(() => {
        const totalCounter = enrichedDemands.reduce((sum, item) => sum + (item.counterRequired || 0), 0);
        const totalCheckin = enrichedDemands.reduce((sum, item) => sum + (item.checkinRequired || 0), 0);
        const totalConcession = enrichedDemands.reduce((sum, item) => sum + (item.concessionRequired || 0), 0);
        const totalMulti = enrichedDemands.reduce((sum, item) => sum + (item.multiRequired || 0), 0);

        const busiestShift = [...enrichedDemands].sort(
            (a, b) => (b.totalRequired || 0) - (a.totalRequired || 0)
        )[0] || null;

        const maxedShifts = enrichedDemands.filter(
            (item) => item.totalRequired >= MAX_STAFF_PER_SHIFT
        ).length;

        const publishedPlans = plans.filter((plan) => plan.status === "PUBLISHED").length;
        const confirmedAssignments = assignments.filter((item) => item.status === "CONFIRMED").length;
        const pendingAssignments = assignments.filter((item) => item.status === "PUBLISHED").length;

        return {
            totalCounter,
            totalCheckin,
            totalConcession,
            totalMulti,
            shifts: enrichedDemands.length,
            busiestShift,
            maxedShifts,
            publishedPlans,
            confirmedAssignments,
            pendingAssignments,
            assignments: assignments.length,
        };
    }, [enrichedDemands, plans, assignments]);

    const syncDetailDateAfterBatch = async (startDate, endDate) => {
        const nextViewDate = businessDate >= startDate && businessDate <= endDate
            ? businessDate
            : startDate;

        if (nextViewDate !== businessDate) {
            setBusinessDate(nextViewDate);
            return;
        }

        await loadPage(nextViewDate);
    };

    const handleApplySingleDayPreset = () => {
        setRangeStartDate(businessDate);
        setRangeEndDate(businessDate);
    };

    const handleApplyWeekPreset = () => {
        setRangeStartDate(businessDate);
        setRangeEndDate(addDays(businessDate, 6));
    };

    const handleApplyMonthPreset = () => {
        const monthRange = getMonthRange(businessDate);
        setRangeStartDate(monthRange.startDate);
        setRangeEndDate(monthRange.endDate);
    };

    const handleGenerateDemand = async () => {
        if (!selectedRangeDays) {
            setError("Khoảng ngày không hợp lệ. Hãy kiểm tra lại từ ngày và đến ngày.");
            return;
        }

        try {
            setActionKey("generate-demand");
            setError("");
            setSuccess("");
            setBatchResult(null);

            if (selectedRangeDays === 1) {
                await staffSchedulingAdminApi.generateDemand({
                    businessDate: rangeStartDate,
                    windowMinutes: Number(windowMinutes),
                    overwrite: true,
                });
                setSuccess(`Đã ước lượng nhu cầu nhân sự cho ngày ${rangeStartDate}.`);
                await syncDetailDateAfterBatch(rangeStartDate, rangeEndDate);
                return;
            }

            const response = await staffSchedulingAdminApi.generateDemandRange({
                startDate: rangeStartDate,
                endDate: rangeEndDate,
                windowMinutes: Number(windowMinutes),
                overwrite: true,
            });

            setBatchResult({ type: "demand", data: response.data });
            setSuccess(buildDemandSuccessMessage(response.data));
            await syncDetailDateAfterBatch(rangeStartDate, rangeEndDate);
        } catch (err) {
            setError(getErrorMessage(err, "Không thể ước lượng nhu cầu theo ca."));
        } finally {
            setActionKey("");
        }
    };

    const handleGeneratePlan = async () => {
        if (!selectedRangeDays) {
            setError("Khoảng ngày không hợp lệ. Hãy kiểm tra lại từ ngày và đến ngày.");
            return;
        }

        try {
            setActionKey("generate-plan");
            setError("");
            setSuccess("");
            setBatchResult(null);

            if (selectedRangeDays === 1) {
                await staffSchedulingAdminApi.generatePlan({ businessDate: rangeStartDate });
                setSuccess(`Đã tạo lịch làm việc cho ngày ${rangeStartDate}.`);
                await syncDetailDateAfterBatch(rangeStartDate, rangeEndDate);
                return;
            }

            const response = await staffSchedulingAdminApi.generatePlanRange({
                startDate: rangeStartDate,
                endDate: rangeEndDate,
            });

            setBatchResult({ type: "plan", data: response.data });
            setSuccess(buildPlanSuccessMessage(response.data));
            await syncDetailDateAfterBatch(rangeStartDate, rangeEndDate);
        } catch (err) {
            setError(getErrorMessage(err, "Không thể tạo lịch theo ca."));
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
            setSuccess("Đã phát hành lịch làm việc cho nhân sự.");
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
                <div className="header-copy">
                    <div className="staff-scheduling-kicker">Admin Operations</div>
                    <h1>Phân ca nhân sự theo ca làm việc</h1>
                    <p>
                        Hệ thống lập lịch theo ca. Showtime chỉ là tín hiệu đầu vào để ước lượng
                        tải vận hành của từng ca, từ đó gợi ý số lượng nhân sự phù hợp cho từng vị trí.
                    </p>
                </div>

                <div className="staff-scheduling-toolbar">
                    <label>
                        Ngày xem chi tiết
                        <input
                            type="date"
                            value={businessDate}
                            onChange={(e) => setBusinessDate(e.target.value)}
                        />
                    </label>

                    <label>
                        Từ ngày
                        <input
                            type="date"
                            value={rangeStartDate}
                            onChange={(e) => setRangeStartDate(e.target.value)}
                        />
                    </label>

                    <label>
                        Đến ngày
                        <input
                            type="date"
                            value={rangeEndDate}
                            onChange={(e) => setRangeEndDate(e.target.value)}
                        />
                    </label>

                    <label>
                        Mức gom dữ liệu
                        <select
                            value={windowMinutes}
                            onChange={(e) => setWindowMinutes(e.target.value)}
                        >
                            <option value={15}>15 phút</option>
                            <option value={30}>30 phút</option>
                            <option value={60}>60 phút</option>
                        </select>
                    </label>

                    <button
                        type="button"
                        className="secondary"
                        onClick={handleApplySingleDayPreset}
                    >
                        Dùng ngày đang xem
                    </button>

                    <button
                        type="button"
                        className="secondary"
                        onClick={handleApplyWeekPreset}
                    >
                        Dùng 7 ngày tính từ hiện tại
                    </button>

                    <button
                        type="button"
                        className="secondary"
                        onClick={handleApplyMonthPreset}
                    >
                        Dùng tháng hiện tại
                    </button>

                    <button
                        type="button"
                        className="primary"
                        onClick={handleGenerateDemand}
                        disabled={actionKey === "generate-demand"}
                    >
                        {actionKey === "generate-demand"
                            ? "Đang xử lý..."
                            : selectedRangeDays > 1
                                ? `Ước lượng nhu cầu ${selectedRangeDays} ngày`
                                : "Ước lượng nhu cầu theo ca"}
                    </button>

                    <button
                        type="button"
                        className="secondary"
                        onClick={handleGeneratePlan}
                        disabled={actionKey === "generate-plan"}
                    >
                        {actionKey === "generate-plan"
                            ? "Đang tạo..."
                            : selectedRangeDays > 1
                                ? `Tạo lịch ${selectedRangeDays} ngày`
                                : "Tạo lịch theo ca"}
                    </button>

                    {latestDraftPlan && (
                        <button
                            type="button"
                            className="success"
                            onClick={() => handlePublishPlan(latestDraftPlan.id)}
                            disabled={actionKey === `publish-${latestDraftPlan.id}`}
                        >
                            {actionKey === `publish-${latestDraftPlan.id}`
                                ? "Đang publish..."
                                : "Phát hành plan mới nhất"}
                        </button>
                    )}
                </div>
            </div>

            <div className="staff-scheduling-insight">
                <div>
                    <strong>Khoảng generate:</strong> {buildRangeSummary(rangeStartDate, rangeEndDate)}
                </div>
                <div>
                    Màn hình bên dưới vẫn hiển thị chi tiết của ngày <strong>{businessDate}</strong> để bạn
                    kiểm tra demand, plan và assignment mà không phải nhìn một mớ dữ liệu cả tháng như mê cung.
                </div>
            </div>

            {error && <div className="staff-scheduling-banner error">{error}</div>}
            {success && <div className="staff-scheduling-banner success">{success}</div>}

            {batchResult && (
                <section className="staff-scheduling-panel">
                    <div className="panel-head">
                        <div>
                            <h2>Kết quả generate hàng loạt</h2>
                            <p className="panel-subtitle">
                                Tóm tắt đợt xử lý theo khoảng ngày vừa chạy.
                            </p>
                        </div>
                        <span>
                            {batchResult.type === "demand" ? "Demand batch" : "Plan batch"}
                        </span>
                    </div>

                    <div className="staff-scheduling-stats">
                        <div className="staff-scheduling-stat-card highlight">
                            <span>Khoảng ngày</span>
                            <strong>
                                {batchResult.data?.startDate} → {batchResult.data?.endDate}
                            </strong>
                            <small>{batchResult.data?.totalDaysRequested || 0} ngày được yêu cầu</small>
                        </div>

                        <div className="staff-scheduling-stat-card">
                            <span>Ngày thành công</span>
                            <strong>{batchResult.data?.successDays || 0}</strong>
                            <small>Số ngày generate hoàn tất</small>
                        </div>

                        <div className="staff-scheduling-stat-card">
                            <span>Ngày lỗi</span>
                            <strong>{batchResult.data?.failedDays || 0}</strong>
                            <small>Lỗi từng ngày sẽ hiện phía dưới</small>
                        </div>

                        <div className="staff-scheduling-stat-card">
                            <span>
                                {batchResult.type === "demand" ? "Khung demand" : "Assignments"}
                            </span>
                            <strong>
                                {batchResult.type === "demand"
                                    ? batchResult.data?.totalDemandWindows || 0
                                    : batchResult.data?.totalAssignments || 0}
                            </strong>
                            <small>
                                {batchResult.type === "demand"
                                    ? "Tổng demand windows được tạo"
                                    : "Tổng assignment được sinh ra"}
                            </small>
                        </div>
                    </div>

                    {Array.isArray(batchResult.data?.issues) && batchResult.data.issues.length > 0 ? (
                        <div className="table-shell" style={{ marginTop: 16 }}>
                            <table className="staff-table">
                                <thead>
                                <tr>
                                    <th>Ngày</th>
                                    <th>Lỗi</th>
                                </tr>
                                </thead>
                                <tbody>
                                {batchResult.data.issues.map((issue, index) => (
                                    <tr key={`${issue.businessDate}-${index}`}>
                                        <td>
                                            <strong>{issue.businessDate}</strong>
                                        </td>
                                        <td>{issue.message}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ marginTop: 16 }}>
                            Không có ngày nào bị lỗi trong đợt generate này.
                        </div>
                    )}
                </section>
            )}

            <div className="staff-scheduling-stats">
                <div className="staff-scheduling-stat-card highlight">
                    <span>Số ca có demand</span>
                    <strong>{stats.shifts}</strong>
                    <small>Ca đang được hệ thống đánh giá tải</small>
                </div>

                <div className="staff-scheduling-stat-card">
                    <span>Ca chạm trần</span>
                    <strong>{stats.maxedShifts}</strong>
                    <small>Tối đa {MAX_STAFF_PER_SHIFT} người / ca</small>
                </div>

                <div className="staff-scheduling-stat-card">
                    <span>Counter / Check-in</span>
                    <strong>{stats.totalCounter} / {stats.totalCheckin}</strong>
                    <small>Nhu cầu vận hành tuyến trước</small>
                </div>

                <div className="staff-scheduling-stat-card">
                    <span>Concession / Multi</span>
                    <strong>{stats.totalConcession} / {stats.totalMulti}</strong>
                    <small>Quầy bắp nước và hỗ trợ linh hoạt</small>
                </div>

                <div className="staff-scheduling-stat-card">
                    <span>Assignments</span>
                    <strong>{stats.assignments}</strong>
                    <small>{stats.pendingAssignments} chờ xác nhận</small>
                </div>

                <div className="staff-scheduling-stat-card">
                    <span>Đã xác nhận</span>
                    <strong>{stats.confirmedAssignments}</strong>
                    <small>{stats.publishedPlans} plan đã publish</small>
                </div>
            </div>

            {stats.busiestShift && (
                <div className="staff-scheduling-insight">
                    <div>
                        <strong>Ca áp lực cao nhất:</strong>{" "}
                        {stats.busiestShift.shiftName || stats.busiestShift.shiftCode || "Ca vận hành"}
                    </div>
                    <div>
                        {formatShortTime(stats.busiestShift.windowStart)} -{" "}
                        {formatShortTime(stats.busiestShift.windowEnd)} ·{" "}
                        {stats.busiestShift.totalRequired}/{MAX_STAFF_PER_SHIFT} người ·{" "}
                        {stats.busiestShift.loadLevel.label}
                    </div>
                </div>
            )}

            <div className="staff-scheduling-grid">
                <section className="staff-scheduling-panel">
                    <div className="panel-head">
                        <div>
                            <h2>Nhu cầu nhân sự theo ca</h2>
                            <p className="panel-subtitle">
                                Chi tiết demand của ngày đang xem. Dùng khu vực trên để generate cho nhiều ngày,
                                rồi quay lại đây để soi từng ngày.
                            </p>
                        </div>
                        <span>{enrichedDemands.length} ca</span>
                    </div>

                    {loading ? (
                        <div className="empty-state">Đang tải dữ liệu...</div>
                    ) : enrichedDemands.length === 0 ? (
                        <div className="empty-state">
                            Chưa có demand cho ngày này. Hãy ước lượng nhu cầu trước.
                        </div>
                    ) : (
                        <div className="shift-demand-list">
                            {enrichedDemands.map((item) => (
                                <article className="shift-demand-card" key={item.id}>
                                    <div className="shift-demand-top">
                                        <div>
                                            <h3>{item.shiftName || item.shiftCode || "Ca vận hành"}</h3>
                                            <p>
                                                {formatShortTime(item.windowStart)} - {formatShortTime(item.windowEnd)}
                                            </p>
                                        </div>

                                        <div className="shift-demand-badges">
                                            <span className={`load-chip ${item.loadLevel.className}`}>
                                                {item.loadLevel.label}
                                            </span>
                                            {item.totalRequired >= MAX_STAFF_PER_SHIFT && (
                                                <span className="max-chip">MAX 6</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shift-demand-total">
                                        <span>Tổng nhân sự</span>
                                        <strong>
                                            {item.totalRequired}/{MAX_STAFF_PER_SHIFT}
                                        </strong>
                                    </div>

                                    <div className="shift-demand-progress">
                                        <div
                                            className={`shift-demand-progress-bar ${item.loadLevel.className}`}
                                            style={{ width: `${item.ratio}%` }}
                                        />
                                    </div>

                                    <div className="shift-demand-metrics">
                                        <div className="metric-box">
                                            <span>Counter</span>
                                            <strong>{item.counterRequired || 0}</strong>
                                        </div>
                                        <div className="metric-box">
                                            <span>Check-in</span>
                                            <strong>{item.checkinRequired || 0}</strong>
                                        </div>
                                        <div className="metric-box">
                                            <span>Concession</span>
                                            <strong>{item.concessionRequired || 0}</strong>
                                        </div>
                                        <div className="metric-box">
                                            <span>Multi</span>
                                            <strong>{item.multiRequired || 0}</strong>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="staff-scheduling-panel">
                    <div className="panel-head">
                        <div>
                            <h2>Plans trong ngày</h2>
                            <p className="panel-subtitle">
                                Quản lý phiên bản plan của ngày đang xem trước khi staff xác nhận.
                            </p>
                        </div>
                        <span>{plans.length} plan</span>
                    </div>

                    {plans.length === 0 ? (
                        <div className="empty-state">Chưa có plan nào được tạo.</div>
                    ) : (
                        <div className="plan-list">
                            {plans.map((plan) => (
                                <article className="plan-card" key={plan.id}>
                                    <div className="plan-card-head">
                                        <div>
                                            <h3>Plan #{plan.id}</h3>
                                            <p>{plan.note || "Kế hoạch phân ca trong ngày"}</p>
                                        </div>

                                        <span className={`status-chip ${plan.status?.toLowerCase() || ""}`}>
                                            {planStatusLabel[plan.status] || plan.status}
                                        </span>
                                    </div>

                                    <div className="plan-card-meta">
                                        <span>Sinh lúc: {formatDateTime(plan.generatedAt)}</span>
                                        <span>Assignments: {plan.assignmentCount || 0}</span>
                                    </div>

                                    {plan.status === "DRAFT" && (
                                        <button
                                            type="button"
                                            className="success"
                                            onClick={() => handlePublishPlan(plan.id)}
                                            disabled={actionKey === `publish-${plan.id}`}
                                        >
                                            {actionKey === `publish-${plan.id}`
                                                ? "Đang publish..."
                                                : "Publish plan này"}
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="staff-scheduling-panel">
                <div className="panel-head">
                    <div>
                        <h2>Phân công nhân sự</h2>
                        <p className="panel-subtitle">
                            Danh sách assignment theo ca, vị trí và trạng thái xác nhận của ngày đang xem.
                        </p>
                    </div>
                    <span>{assignments.length} assignment</span>
                </div>

                {assignments.length === 0 ? (
                    <div className="empty-state">Chưa có assignment nào trong ngày.</div>
                ) : (
                    <div className="table-shell">
                        <table className="staff-table">
                            <thead>
                            <tr>
                                <th>Nhân sự</th>
                                <th>Vị trí</th>
                                <th>Ca</th>
                                <th>Trạng thái</th>
                                <th>Giải thích</th>
                            </tr>
                            </thead>
                            <tbody>
                            {assignments.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <div className="staff-name-cell">
                                            <strong>{item.staffName}</strong>
                                            <span>@{item.staffUsername}</span>
                                        </div>
                                    </td>

                                    <td>
                                        <span className="position-pill">{item.assignedPosition}</span>
                                    </td>

                                    <td>
                                        <div className="shift-label">
                                            <strong>{item.shiftName || item.shiftCode || "Ca làm việc"}</strong>
                                            <span>
                                                {formatDateTime(item.shiftStart)} - {formatDateTime(item.shiftEnd)}
                                            </span>
                                        </div>
                                    </td>

                                    <td>
                                        <span className={`status-chip ${item.status?.toLowerCase() || ""}`}>
                                            {assignmentStatusLabel[item.status] || item.status}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className="ghost"
                                            onClick={() => handleReadExplanation(item.id)}
                                            disabled={actionKey === `explain-${item.id}`}
                                        >
                                            {actionKey === `explain-${item.id}` ? "Đang tải..." : "Xem"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="staff-scheduling-panel">
                <div className="panel-head">
                    <div>
                        <h2>Giải thích phân ca</h2>
                        <p className="panel-subtitle">
                            Quyết định của hệ thống khi chọn nhân sự cho từng ca.
                        </p>
                    </div>
                    <span>Decision trace</span>
                </div>

                {selectedExplanation ? (
                    <div className="explanation-box">
                        <div className="explanation-badge">
                            Assignment #{selectedExplanation.assignmentId}
                        </div>
                        <p>{selectedExplanation.explanation}</p>
                    </div>
                ) : (
                    <div className="empty-state">
                        Chọn một assignment để xem lý do hệ thống gợi ý ca cho nhân sự đó.
                    </div>
                )}
            </section>
        </div>
    );
}
