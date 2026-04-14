import React, { useState, useEffect } from "react";
import { seatPriceService } from "../../services/seatPriceService";
import { surchargeService } from "../../services/surchargeService";
import {
    RiArmchairFill,
    RiVipCrownFill,
    RiVipDiamondFill,
    RiHeartFill,
    RiSave3Fill,
    RiRefreshLine,
    RiErrorWarningLine,
    RiCheckboxCircleLine,
    RiInformationLine,
    RiCalendarEventFill,
    RiAddLine,
    RiDeleteBinLine,
    RiToggleLine,
    RiToggleFill,
    RiEditLine,
    RiCloseLine,
} from "react-icons/ri";
import "./SeatPriceManager.css";

const SEAT_META = {
    NORMAL: { icon: <RiArmchairFill />, cls: "normal", label: "Ghế thường", desc: "Hàng tiêu chuẩn" },
    VIP: { icon: <RiVipCrownFill />, cls: "vip", label: "Ghế VIP", desc: "Hàng giữa, ưu tiên" },
    PREMIUM: { icon: <RiVipDiamondFill />, cls: "premium", label: "Ghế Premium", desc: "Hàng đầu, rộng rãi" },
    COUPLE: { icon: <RiHeartFill />, cls: "couple", label: "Ghế đôi", desc: "Cặp đôi, ghế liền" },
};

const fmtPrice = (v) => (v || 0).toLocaleString("vi-VN");
const parsePrice = (v) => {
    const s = v.replace(/\D/g, "");
    return s === "" ? 0 : parseInt(s, 10);
};

const SeatPriceManager = () => {
    /* ── Block 1: Giá ghế ─────────────────────── */
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");

    /* ── Block 2: Phụ thu ─────────────────────── */
    const [weekend, setWeekend] = useState({ enabled: false, surchargeAmount: 0 });
    const [weekendSaving, setWeekendSaving] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [holidayLoading, setHolidayLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "", surchargeAmount: 0 });
    const [surchargeError, setSurchargeError] = useState(null);
    const [surchargeSuccess, setSurchargeSuccess] = useState("");

    useEffect(() => {
        fetchPrices();
        fetchWeekend();
        fetchHolidays();
    }, []);

    /* ── Fetchers ─────────────────────────────── */
    const fetchPrices = async () => {
        try { setLoading(true); const r = await seatPriceService.getAll(); setPrices(r.data); }
        catch { setError("Không thể tải danh sách giá ghế."); }
        finally { setLoading(false); }
    };
    const fetchWeekend = async () => {
        try { const r = await surchargeService.getWeekend(); setWeekend(r.data); } catch { /* silent */ }
    };
    const fetchHolidays = async () => {
        try { setHolidayLoading(true); const r = await surchargeService.getHolidays(); setHolidays(r.data); }
        catch { /* silent */ }
        finally { setHolidayLoading(false); }
    };

    /* ── Block 1 handlers ─────────────────────── */
    const handlePriceChange = (type, value) => {
        setPrices(prev => prev.map(p => p.seatType === type ? { ...p, basePrice: parsePrice(value) } : p));
    };
    const handleSavePrices = async () => {
        try {
            setSaving(true); setError(null); setSuccessMsg("");
            await seatPriceService.update(prices);
            setSuccessMsg("Cập nhật giá ghế thành công!");
            setTimeout(() => setSuccessMsg(""), 3500);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Không thể lưu thay đổi.");
        } finally { setSaving(false); }
    };

    /* ── Weekend handlers ─────────────────────── */
    const handleWeekendToggle = () => setWeekend(w => ({ ...w, enabled: !w.enabled }));
    const handleWeekendAmountChange = (v) => setWeekend(w => ({ ...w, surchargeAmount: parsePrice(v) }));
    const handleSaveWeekend = async () => {
        try {
            setWeekendSaving(true); setSurchargeError(null);
            await surchargeService.updateWeekend(weekend);
            setSurchargeSuccess("Cập nhật phụ thu cuối tuần thành công!");
            setTimeout(() => setSurchargeSuccess(""), 3500);
        } catch (err) {
            setSurchargeError(err.response?.data?.message || "Lỗi khi lưu phụ thu cuối tuần.");
        } finally { setWeekendSaving(false); }
    };

    /* ── Holiday handlers ─────────────────────── */
    const resetForm = () => { setForm({ name: "", startDate: "", endDate: "", surchargeAmount: 0 }); setEditingId(null); setShowForm(false); };
    const openAddForm = () => { resetForm(); setShowForm(true); };
    const openEditForm = (h) => {
        setForm({ name: h.name, startDate: h.startDate, endDate: h.endDate, surchargeAmount: h.surchargeAmount });
        setEditingId(h.id);
        setShowForm(true);
    };
    const handleFormChange = (field, value) => {
        if (field === "surchargeAmount") value = parsePrice(value);
        setForm(f => ({ ...f, [field]: value }));
    };
    const handleSaveHoliday = async () => {
        if (!form.name || !form.startDate || !form.endDate) {
            setSurchargeError("Vui lòng nhập đầy đủ tên, ngày bắt đầu và ngày kết thúc.");
            return;
        }
        try {
            setSurchargeError(null);
            if (editingId) {
                await surchargeService.updateHoliday(editingId, form);
            } else {
                await surchargeService.createHoliday({ ...form, active: true });
            }
            resetForm();
            fetchHolidays();
            setSurchargeSuccess(editingId ? "Cập nhật ngày lễ thành công!" : "Thêm ngày lễ thành công!");
            setTimeout(() => setSurchargeSuccess(""), 3500);
        } catch (err) {
            setSurchargeError(err.response?.data?.message || "Lỗi khi lưu ngày lễ.");
        }
    };
    const handleToggleHoliday = async (id) => {
        try { await surchargeService.toggleHoliday(id); fetchHolidays(); } catch { /* silent */ }
    };
    const handleDeleteHoliday = async (id) => {
        if (!window.confirm("Xác nhận xóa ngày lễ này?")) return;
        try { await surchargeService.deleteHoliday(id); fetchHolidays(); } catch { /* silent */ }
    };

    /* ── Render ────────────────────────────────── */
    if (loading) return (
        <div className="seat-price-manager">
            <div className="loading-state"><RiRefreshLine className="spinner" /><p>Đang tải dữ liệu...</p></div>
        </div>
    );

    return (
        <div className="seat-price-manager">

            {/* ═══════════ BLOCK 1: Giá ghế ═══════════ */}
            <header className="manager-header">
                <div className="header-info">
                    <h1>Giá ghế</h1>
                    <p>Cấu hình mức giá cơ bản cho từng loại ghế</p>
                </div>
                <button className="save-button" onClick={handleSavePrices} disabled={saving}>
                    {saving ? <><RiRefreshLine className="spinner" /> Đang lưu...</> : <><RiSave3Fill /> Lưu thay đổi</>}
                </button>
            </header>

            {error && <div className="message-alert error"><RiErrorWarningLine />{error}</div>}
            {successMsg && <div className="message-alert success"><RiCheckboxCircleLine />{successMsg}</div>}

            <table className="price-table">
                <thead><tr><th>Loại ghế</th><th style={{ textAlign: "right" }}>Giá cơ bản</th></tr></thead>
                <tbody>
                    {prices.map(item => {
                        const meta = SEAT_META[item.seatType] || { icon: <RiArmchairFill />, cls: "normal", label: item.seatType, desc: "" };
                        return (
                            <tr key={item.seatType}>
                                <td>
                                    <div className="seat-type-cell">
                                        <div className={`seat-icon-wrap ${meta.cls}`}>{meta.icon}</div>
                                        <div className="seat-type-info"><strong>{meta.label}</strong><span>{meta.desc}</span></div>
                                    </div>
                                </td>
                                <td className="price-cell">
                                    <div className="price-input-row">
                                        <input type="text" value={fmtPrice(item.basePrice)} onChange={e => handlePriceChange(item.seatType, e.target.value)} placeholder="0" />
                                        <span className="unit">VND</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="manager-notice">
                <RiInformationLine className="notice-icon" />
                <p>Thay đổi giá chỉ áp dụng cho các <strong>suất chiếu khởi tạo sau này</strong>. Các suất chiếu hiện có sẽ giữ nguyên giá.</p>
            </div>

            {/* ═══════════ BLOCK 2: Phụ thu ═══════════ */}
            <div className="surcharge-section">
                <header className="manager-header">
                    <div className="header-info">
                        <h1><RiCalendarEventFill className="section-icon" /> Phụ thu ngày đặc biệt</h1>
                        <p>Cấu hình phụ thu cuối tuần và ngày lễ</p>
                    </div>
                </header>

                {surchargeError && <div className="message-alert error"><RiErrorWarningLine />{surchargeError}</div>}
                {surchargeSuccess && <div className="message-alert success"><RiCheckboxCircleLine />{surchargeSuccess}</div>}

                {/* ── Weekend Card ─────────────────── */}
                <div className="weekend-card">
                    <div className="weekend-header">
                        <div className="weekend-label">
                            <strong>Phụ thu Cuối tuần</strong>
                            <span>Tự động áp dụng cho mọi Thứ 7 &amp; Chủ Nhật</span>
                        </div>
                        <button className={`toggle-btn ${weekend.enabled ? "on" : "off"}`} onClick={handleWeekendToggle} title={weekend.enabled ? "Tắt" : "Bật"}>
                            {weekend.enabled ? <RiToggleFill /> : <RiToggleLine />}
                            {weekend.enabled ? "Bật" : "Tắt"}
                        </button>
                    </div>

                    {weekend.enabled && (
                        <div className="weekend-body">
                            <div className="weekend-field">
                                <label>Cộng thêm</label>
                                <div className="price-input-row">
                                    <span className="unit prefix">+</span>
                                    <input type="text" value={fmtPrice(weekend.surchargeAmount)} onChange={e => handleWeekendAmountChange(e.target.value)} placeholder="0" />
                                    <span className="unit">VND</span>
                                </div>
                            </div>
                            <button className="save-button sm" onClick={handleSaveWeekend} disabled={weekendSaving}>
                                {weekendSaving ? <><RiRefreshLine className="spinner" /> Lưu...</> : <><RiSave3Fill /> Lưu</>}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Holiday Table ────────────────── */}
                <div className="holiday-block">
                    <div className="holiday-header">
                        <strong>Ngày lễ / Tết</strong>
                        <button className="add-btn" onClick={openAddForm}><RiAddLine /> Thêm ngày lễ</button>
                    </div>

                    {/* Inline Form */}
                    {showForm && (
                        <div className="holiday-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tên ngày lễ</label>
                                    <input type="text" value={form.name} onChange={e => handleFormChange("name", e.target.value)} placeholder="VD: Lễ Quốc Khánh" />
                                </div>
                                <div className="form-group">
                                    <label>Từ ngày</label>
                                    <input type="date" value={form.startDate} onChange={e => handleFormChange("startDate", e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Đến ngày</label>
                                    <input type="date" value={form.endDate} onChange={e => handleFormChange("endDate", e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Phụ thu</label>
                                    <div className="price-input-row compact">
                                        <span className="unit prefix">+</span>
                                        <input type="text" value={fmtPrice(form.surchargeAmount)} onChange={e => handleFormChange("surchargeAmount", e.target.value)} placeholder="0" />
                                        <span className="unit">VND</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-actions">
                                <button className="save-button sm" onClick={handleSaveHoliday}>
                                    <RiSave3Fill /> {editingId ? "Cập nhật" : "Thêm"}
                                </button>
                                <button className="cancel-btn" onClick={resetForm}><RiCloseLine /> Hủy</button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {holidays.length === 0 && !holidayLoading ? (
                        <div className="empty-state">Chưa có ngày lễ nào. Hãy nhấn "Thêm ngày lễ" để bắt đầu.</div>
                    ) : (
                        <table className="price-table holiday-table">
                            <thead>
                                <tr>
                                    <th>Tên ngày lễ</th>
                                    <th>Ngày áp dụng</th>
                                    <th style={{ textAlign: "right" }}>Mức phụ thu</th>
                                    <th style={{ textAlign: "center" }}>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map(h => (
                                    <tr key={h.id} className={!h.active ? "row-disabled" : ""}>
                                        <td><strong>{h.name}</strong></td>
                                        <td>{formatDate(h.startDate)} → {formatDate(h.endDate)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                                            + {fmtPrice(h.surchargeAmount)} VND
                                        </td>
                                        <td className="actions-cell">
                                            <button className="icon-btn" title="Sửa" onClick={() => openEditForm(h)}><RiEditLine /></button>
                                            <button className="icon-btn" title={h.active ? "Vô hiệu hóa" : "Bật lại"} onClick={() => handleToggleHoliday(h.id)}>
                                                {h.active ? <RiToggleFill className="toggle-on" /> : <RiToggleLine />}
                                            </button>
                                            <button className="icon-btn danger" title="Xóa" onClick={() => handleDeleteHoliday(h.id)}><RiDeleteBinLine /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

function formatDate(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
}

export default SeatPriceManager;