import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getAdminInvoices } from "../../../api/adminInvoiceApi";
import "./AdminInvoices.css";

// ── Utility helpers ────────────────────────────────────────────────────────

function formatCurrency(amount) {
    if (amount == null) return "—";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

function formatDateTime(dt) {
    if (!dt) return "—";
    const d = new Date(dt);
    return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function toDateInput(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toISOString().split("T")[0];
}

function getInitials(name) {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
}

function getQuickRange(preset) {
    const today = new Date();
    const fmt = (d) => d.toISOString().split("T")[0];
    if (preset === "today") {
        return { from: fmt(today), to: fmt(today) };
    }
    if (preset === "week") {
        const d = new Date(today);
        d.setDate(d.getDate() - 6);
        return { from: fmt(d), to: fmt(today) };
    }
    if (preset === "month") {
        const d = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: fmt(d), to: fmt(today) };
    }
    return { from: "", to: "" };
}

// ── Status / Payment method helpers ──────────────────────────────────────

function StatusBadge({ status }) {
    const cls = status?.toLowerCase() === "paid"
        ? "paid"
        : status?.toLowerCase() === "cancelled"
            ? "cancelled"
            : "draft";
    const label = status === "PAID" ? "✓ Đã thanh toán"
        : status === "CANCELLED" ? "✗ Đã hủy" : status || "Draft";
    return <span className={`ai-status-badge ${cls}`}>{label}</span>;
}

function PmBadge({ method }) {
    const m = (method || "").toUpperCase();
    const cls = m === "PAYOS" ? "payos" : m === "CASH" ? "cash" : m === "CARD" ? "card" : "other";
    const label = m === "PAYOS" ? "💳 PayOS" : m === "CASH" ? "💵 Tiền mặt" : m === "CARD" ? "🏦 Thẻ" : method || "—";
    return <span className={`ai-pm-badge ${cls}`}>{label}</span>;
}

// ── Modal Detail ───────────────────────────────────────────────────────────

function InvoiceModal({ invoice, onClose }) {
    if (!invoice) return null;

    return (
        <div className="ai-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="ai-modal">
                {/* Header */}
                <div className="ai-modal-header">
                    <div className="ai-modal-title">
                        🎟️ Hóa đơn #{invoice.invoiceId}
                        <StatusBadge status={invoice.status} />
                    </div>
                    <button className="ai-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="ai-modal-body">
                    {/* Thông tin chung */}
                    <div className="ai-modal-section">
                        <div className="ai-modal-section-title">👤 Thông tin khách hàng</div>
                        <div className="ai-info-grid">
                            <div className="ai-info-row">
                                <span className="ai-info-label">Khách hàng</span>
                                <span className="ai-info-value">{invoice.customerUsername || "—"}</span>
                            </div>
                            <div className="ai-info-row">
                                <span className="ai-info-label">Thời gian đặt</span>
                                <span className="ai-info-value">{formatDateTime(invoice.createdAt)}</span>
                            </div>
                            <div className="ai-info-row">
                                <span className="ai-info-label">Phương thức TT</span>
                                <span className="ai-info-value"><PmBadge method={invoice.paymentMethod} /></span>
                            </div>
                            <div className="ai-info-row">
                                <span className="ai-info-label">Mã giao dịch</span>
                                <span className="ai-info-value mono">{invoice.orderCode || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin phim */}
                    {invoice.movieTitle && (
                        <div className="ai-modal-section">
                            <div className="ai-modal-section-title">🎬 Phim & Suất chiếu</div>
                            <div className="ai-info-grid">
                                <div className="ai-info-row">
                                    <span className="ai-info-label">Tên phim</span>
                                    <span className="ai-info-value">{invoice.movieTitle}</span>
                                </div>
                                <div className="ai-info-row">
                                    <span className="ai-info-label">Phòng chiếu</span>
                                    <span className="ai-info-value">{invoice.roomName || "—"}</span>
                                </div>
                                <div className="ai-info-row">
                                    <span className="ai-info-label">Giờ bắt đầu</span>
                                    <span className="ai-info-value">{formatDateTime(invoice.startTime)}</span>
                                </div>
                                <div className="ai-info-row">
                                    <span className="ai-info-label">Giờ kết thúc</span>
                                    <span className="ai-info-value">{formatDateTime(invoice.endTime)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ghế */}
                    {invoice.seats?.length > 0 && (
                        <div className="ai-modal-section">
                            <div className="ai-modal-section-title">💺 Ghế đã đặt ({invoice.seats.length} ghế)</div>
                            <div className="ai-seats-list">
                                {invoice.seats.map((s, i) => (
                                    <div key={i} className="ai-seat-chip">
                                        <span className="ai-seat-chip-code">{s.seatCode}</span>
                                        <span className="ai-seat-chip-type">{s.seatType}</span>
                                        <span className="ai-seat-chip-price">{formatCurrency(s.price)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Combo */}
                    {invoice.combos?.length > 0 && (
                        <div className="ai-modal-section">
                            <div className="ai-modal-section-title">🍿 Combo bắp nước</div>
                            <div className="ai-combo-list">
                                {invoice.combos.map((c, i) => (
                                    <div key={i} className="ai-combo-item">
                                        <span className="ai-combo-name">
                                            <span className="ai-combo-qty">x{c.quantity}</span>
                                            {c.comboName}
                                        </span>
                                        <span className="ai-combo-price">{formatCurrency(c.price)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tổng tiền */}
                    <div className="ai-modal-total">
                        <span className="ai-modal-total-label">Tổng thanh toán</span>
                        <span className="ai-modal-total-value">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function AdminInvoices() {
    const [invoices, setInvoices]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [selected, setSelected]       = useState(null);
    const [page, setPage]               = useState(1);
    const [quickPreset, setQuickPreset] = useState("");

    // Filter state
    const [search, setSearch]   = useState("");
    const [status, setStatus]   = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate]   = useState("");

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchInvoices = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAdminInvoices(params);
            setInvoices(data || []);
            setPage(1);
        } catch (err) {
            console.error(err);
            setError("Không thể tải danh sách hóa đơn. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvoices({});
    }, [fetchInvoices]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleFilter = () => {
        fetchInvoices({ search, status, from: fromDate, to: toDate });
    };

    const handleReset = () => {
        setSearch(""); setStatus(""); setFromDate(""); setToDate(""); setQuickPreset("");
        fetchInvoices({});
    };

    const handleQuick = (preset) => {
        const { from, to } = getQuickRange(preset);
        setFromDate(from); setToDate(to); setQuickPreset(preset);
        fetchInvoices({ search, status, from, to });
    };

    const handleExportCSV = () => {
        if (!invoices.length) return;
        const header = ["ID", "Khách hàng", "Phim", "Suất chiếu", "Phòng", "Ghế", "PTTT", "Tổng tiền", "Trạng thái", "Mã GD", "Ngày đặt"];
        const rows = invoices.map(inv => [
            inv.invoiceId,
            inv.customerUsername || "",
            inv.movieTitle || "",
            inv.startTime ? new Date(inv.startTime).toLocaleString("vi-VN") : "",
            inv.roomName || "",
            (inv.seats || []).map(s => s.seatCode).join(", "),
            inv.paymentMethod || "",
            inv.totalAmount || 0,
            inv.status || "",
            inv.orderCode || "",
            inv.createdAt ? new Date(inv.createdAt).toLocaleString("vi-VN") : "",
        ]);
        const csv = [header, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url;
        a.download = `hoa-don-${new Date().toISOString().split("T")[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ── Pagination ─────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
    const paginated  = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // ── Stats ──────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const paid       = invoices.filter(i => i.status === "PAID");
        const cancelled  = invoices.filter(i => i.status === "CANCELLED");
        const revenue    = paid.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
        const payos      = invoices.filter(i => (i.paymentMethod || "").toUpperCase() === "PAYOS").length;
        return { total: invoices.length, paid: paid.length, cancelled: cancelled.length, revenue, payos };
    }, [invoices]);

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="ai-page">
            {/* Header */}
            <div className="ai-header">
                <h1 className="ai-title">
                    <span className="ai-title-icon">🎟️</span>
                    Quản lý Hóa Đơn
                    <span className="ai-badge-count">{invoices.length}</span>
                </h1>
                <button className="ai-export-btn" onClick={handleExportCSV}>
                    📥 Xuất CSV
                </button>
            </div>

            {/* Stats */}
            <div className="ai-stats">
                <div className="ai-stat-card">
                    <span className="ai-stat-label">Tổng hóa đơn</span>
                    <span className="ai-stat-value blue">{stats.total}</span>
                </div>
                <div className="ai-stat-card">
                    <span className="ai-stat-label">Đã thanh toán</span>
                    <span className="ai-stat-value green">{stats.paid}</span>
                </div>
                <div className="ai-stat-card">
                    <span className="ai-stat-label">Đã hủy</span>
                    <span className="ai-stat-value red">{stats.cancelled}</span>
                </div>
                <div className="ai-stat-card">
                    <span className="ai-stat-label">Doanh thu</span>
                    <span className="ai-stat-value green" style={{ fontSize: "1.1rem" }}>
                        {formatCurrency(stats.revenue)}
                    </span>
                </div>
                <div className="ai-stat-card">
                    <span className="ai-stat-label">Thanh toán PayOS</span>
                    <span className="ai-stat-value purple">{stats.payos}</span>
                </div>
            </div>

            {/* Filters */}
            <div className="ai-filters">
                {/* Tìm tên khách */}
                <div className="ai-filter-group" style={{ flex: 2, minWidth: 200 }}>
                    <span className="ai-filter-label">🔍 Tìm khách hàng</span>
                    <input
                        id="ai-search-input"
                        className="ai-filter-input"
                        type="text"
                        placeholder="Nhập username, email, tên..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleFilter()}
                    />
                </div>

                {/* Trạng thái */}
                <div className="ai-filter-group">
                    <span className="ai-filter-label">📌 Trạng thái</span>
                    <select
                        id="ai-status-select"
                        className="ai-filter-select"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                    >
                        <option value="">Tất cả</option>
                        <option value="PAID">Đã thanh toán</option>
                        <option value="CANCELLED">Đã hủy</option>
                        <option value="DRAFT">Nháp</option>
                    </select>
                </div>

                {/* Từ ngày */}
                <div className="ai-filter-group">
                    <span className="ai-filter-label">📅 Từ ngày</span>
                    <input
                        id="ai-from-date"
                        className="ai-filter-input"
                        type="date"
                        value={fromDate}
                        onChange={e => { setFromDate(e.target.value); setQuickPreset(""); }}
                    />
                </div>

                {/* Đến ngày */}
                <div className="ai-filter-group">
                    <span className="ai-filter-label">📅 Đến ngày</span>
                    <input
                        id="ai-to-date"
                        className="ai-filter-input"
                        type="date"
                        value={toDate}
                        onChange={e => { setToDate(e.target.value); setQuickPreset(""); }}
                    />
                </div>

                {/* Nút nhanh + hành động */}
                <div className="ai-filter-group" style={{ minWidth: "auto" }}>
                    <span className="ai-filter-label">⚡ Chọn nhanh</span>
                    <div className="ai-quick-btns">
                        <button
                            className={`ai-quick-btn ${quickPreset === "today" ? "active" : ""}`}
                            onClick={() => handleQuick("today")}
                        >Hôm nay</button>
                        <button
                            className={`ai-quick-btn ${quickPreset === "week" ? "active" : ""}`}
                            onClick={() => handleQuick("week")}
                        >7 ngày</button>
                        <button
                            className={`ai-quick-btn ${quickPreset === "month" ? "active" : ""}`}
                            onClick={() => handleQuick("month")}
                        >Tháng này</button>
                    </div>
                </div>

                {/* Apply & Reset */}
                <div className="ai-filter-group" style={{ minWidth: "auto" }}>
                    <span className="ai-filter-label">&nbsp;</span>
                    <div className="ai-quick-btns">
                        <button
                            id="ai-apply-filter"
                            className="ai-quick-btn active"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", border: "none" }}
                            onClick={handleFilter}
                        >
                            🔎 Áp dụng
                        </button>
                        <button className="ai-reset-btn" onClick={handleReset}>
                            ↺ Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="ai-table-wrap">
                {loading ? (
                    <div className="ai-loading">
                        <div className="ai-spinner" />
                        <span>Đang tải dữ liệu...</span>
                    </div>
                ) : error ? (
                    <div className="ai-empty">
                        <span className="ai-empty-icon">⚠️</span>
                        <span className="ai-empty-text">{error}</span>
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="ai-empty">
                        <span className="ai-empty-icon">🎟️</span>
                        <span className="ai-empty-text">Không có hóa đơn nào</span>
                    </div>
                ) : (
                    <>
                        <table className="ai-table">
                            <thead>
                                <tr>
                                    <th>#ID</th>
                                    <th>Khách hàng</th>
                                    <th>Phim</th>
                                    <th>Suất chiếu</th>
                                    <th>Ghế</th>
                                    <th>Tổng tiền</th>
                                    <th>PTTT</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày đặt</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map(inv => (
                                    <tr key={inv.invoiceId}>
                                        <td>
                                            <span className="ai-id-cell">#{inv.invoiceId}</span>
                                        </td>
                                        <td>
                                            <div className="ai-customer-cell">
                                                <div className="ai-avatar">
                                                    {getInitials(inv.customerUsername)}
                                                </div>
                                                <span className="ai-customer-name" title={inv.customerUsername}>
                                                    {inv.customerUsername || "—"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="ai-movie-cell" title={inv.movieTitle}>
                                                {inv.movieTitle || <span style={{ color: "#6e7681" }}>Combo only</span>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="ai-time-cell">
                                                {inv.startTime ? formatDateTime(inv.startTime) : "—"}
                                                {inv.roomName && (
                                                    <div style={{ fontSize: "0.72rem", color: "#6e7681" }}>
                                                        {inv.roomName}
                                                    </div>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            {inv.seats?.length > 0 ? (
                                                <div className="ai-seats-cell">
                                                    {inv.seats.slice(0, 4).map((s, i) => (
                                                        <span key={i} className="ai-seat-tag">{s.seatCode}</span>
                                                    ))}
                                                    {inv.seats.length > 4 && (
                                                        <span className="ai-seat-tag" style={{ color: "#8b949e" }}>
                                                            +{inv.seats.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: "#6e7681" }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="ai-amount-cell">
                                                {formatCurrency(inv.totalAmount)}
                                            </span>
                                        </td>
                                        <td><PmBadge method={inv.paymentMethod} /></td>
                                        <td><StatusBadge status={inv.status} /></td>
                                        <td>
                                            <span className="ai-time-cell">
                                                {formatDateTime(inv.createdAt)}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                id={`ai-view-btn-${inv.invoiceId}`}
                                                className="ai-detail-btn"
                                                title="Xem chi tiết"
                                                onClick={() => setSelected(inv)}
                                            >
                                                👁
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="ai-pagination">
                                <span>
                                    Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, invoices.length)} / {invoices.length} hóa đơn
                                </span>
                                <div className="ai-pag-buttons">
                                    <button
                                        className="ai-pag-btn"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >← Trước</button>

                                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                        const p = totalPages <= 7 ? i + 1
                                            : page <= 4 ? i + 1
                                            : page >= totalPages - 3 ? totalPages - 6 + i
                                            : page - 3 + i;
                                        return (
                                            <button
                                                key={p}
                                                className={`ai-pag-btn ${p === page ? "current" : ""}`}
                                                onClick={() => setPage(p)}
                                            >{p}</button>
                                        );
                                    })}

                                    <button
                                        className="ai-pag-btn"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >Sau →</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal chi tiết */}
            {selected && (
                <InvoiceModal invoice={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}
