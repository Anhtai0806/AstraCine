import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { staffApi } from "../../api/staffApi";
import "./StaffTicketScanner.css";

const formatDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function StaffTicketScanner() {
    /* ── state ─────────────────────────────────────── */
    const [manualCode, setManualCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState([]);       // List<StaffTicketVerificationResponse>
    const [selected, setSelected] = useState([]);      // ticketIds that are checked
    const [selectedCombos, setSelectedCombos] = useState([]); // invoiceComboIds that are checked
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [lastScanned, setLastScanned] = useState(""); // prevent rapid duplicate scans

    const scannerRef = useRef(null);   // Html5Qrcode instance
    const readerRef = useRef(null);    // DOM element ref

    /* ── webcam scanner lifecycle ─────────────────── */
    const startScanner = useCallback(async () => {
        if (scannerRef.current) return;                // already running
        const html5Qr = new Html5Qrcode("qr-reader");
        scannerRef.current = html5Qr;

        try {
            await html5Qr.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1.0,
                },
                (decodedText) => handleScan(decodedText),
                () => { /* ignore errors during scan */ }
            );
            setScanning(true);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Không thể truy cập webcam. Vui lòng kiểm tra quyền camera.");
            scannerRef.current = null;
        }
    }, []);

    const stopScanner = useCallback(async () => {
        if (!scannerRef.current) return;
        try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
        } catch (_) { /* ignore */ }
        scannerRef.current = null;
        setScanning(false);
    }, []);

    useEffect(() => {
        startScanner();
        return () => { stopScanner(); };
    }, [startScanner, stopScanner]);

    /* ── core scan handler ────────────────────────── */
    const handleScan = async (qrCode) => {
        if (!qrCode || qrCode === lastScanned) return;
        setLastScanned(qrCode);
        setManualCode(qrCode);
        await doScanTicket(qrCode);
    };

    const doScanTicket = async (qrCode) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setTickets([]);
        setSelected([]);
        setSelectedCombos([]);
        try {
            const data = await staffApi.scanTicket(qrCode);
            setTickets(data);
            // auto-select all that can check in
            const autoSelect = data
                .filter((t) => t.canCheckIn)
                .map((t) => t.ticketId);
            setSelected(autoSelect);
        } catch (err) {
            setTickets([]);
            setError(err?.message || "Không tìm thấy vé hoặc lỗi hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    /* ── manual lookup ────────────────────────────── */
    const handleManualLookup = () => {
        if (!manualCode.trim()) return;
        doScanTicket(manualCode.trim());
    };

    /* ── checkbox logic ───────────────────────────── */
    const checkableTickets = tickets.filter((t) => t.canCheckIn);

    const toggleOne = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selected.length === checkableTickets.length) {
            setSelected([]);
        } else {
            setSelected(checkableTickets.map((t) => t.ticketId));
        }
    };

    /* ── batch & individual check-in ───────────────────────────── */
    const handleCheckIn = async (ticketIdsToProcess = selected) => {
        if (ticketIdsToProcess.length === 0) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const data = await staffApi.confirmCheckIn(ticketIdsToProcess);
            const msg = data?.message || `✅ Check-in thành công! (${ticketIdsToProcess.length})`;
            setSuccess(msg);
            // refresh ticket list after check-in
            if (manualCode.trim()) {
                const data = await staffApi.scanTicket(manualCode.trim());
                setTickets(data);
                setSelected([]);
            }
        } catch (err) {
            setError(err?.message || "Không thể check-in. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    /* ── combo pickup ───────────────────────────── */
    const pendingCombos = tickets[0]?.comboItems?.filter(c => !c.pickedUp) || [];

    const toggleCombo = (id) => {
        setSelectedCombos((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleComboPickup = async () => {
        if (selectedCombos.length === 0) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const data = await staffApi.confirmComboPickup(selectedCombos);
            const msg = data?.message || `✅ Đã đánh dấu nhận ${selectedCombos.length} món combo!`;
            setSuccess(msg);

            // refresh ticket list
            if (manualCode.trim()) {
                const data = await staffApi.scanTicket(manualCode.trim());
                setTickets(data);
                setSelectedCombos([]);
            }
        } catch (err) {
            setError(err?.message || "Lỗi cập nhật combo. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    /* ── reset for new scan ───────────────────────── */
    const handleReset = () => {
        setTickets([]);
        setSelected([]);
        setSelectedCombos([]);
        setError(null);
        setSuccess(null);
        setManualCode("");
        setLastScanned("");
    };

    /* ── render ────────────────────────────────────── */
    return (
        <div className="scanner-page">
            {/* ═══ HEADER ═══ */}
            <div className="scanner-hero">
                <div className="scanner-hero-icon">📷</div>
                <div>
                    <p className="scanner-kicker">SOÁT VÉ QR</p>
                    <h1>Quét mã QR vé bằng Webcam</h1>
                    <p className="scanner-subtitle">
                        Đưa mã QR trước camera hoặc nhập mã thủ công bên dưới.
                        Hệ thống sẽ tự động nhận diện và hiển thị thông tin vé.
                    </p>
                </div>
            </div>

            {/* ═══ MAIN BODY ═══ */}
            <div className="scanner-body">
                {/* ─── Left: Camera ─── */}
                <div className="scanner-cam-col">
                    <div className="scanner-cam-card">
                        <div className="scanner-cam-header">
                            <span className={`cam-dot ${scanning ? "live" : ""}`} />
                            <span>{scanning ? "Camera đang hoạt động" : "Camera tắt"}</span>
                        </div>

                        <div className="scanner-cam-wrapper">
                            <div id="qr-reader" ref={readerRef} />
                            {scanning && <div className="scan-line" />}
                        </div>

                        <div className="scanner-cam-actions">
                            {scanning ? (
                                <button className="btn-cam btn-stop" onClick={stopScanner}>
                                    ⏹ Tắt camera
                                </button>
                            ) : (
                                <button className="btn-cam btn-start" onClick={startScanner}>
                                    ▶ Bật camera
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Manual input */}
                    <div className="manual-input-card">
                        <label>Hoặc nhập mã QR thủ công:</label>
                        <div className="manual-input-row">
                            <input
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Nhập mã QR / ticket code..."
                                onKeyDown={(e) => e.key === "Enter" && handleManualLookup()}
                            />
                            <button
                                onClick={handleManualLookup}
                                disabled={loading || !manualCode.trim()}
                            >
                                {loading ? "⏳" : "🔍 Tra cứu"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─── Right: Results ─── */}
                <div className="scanner-result-col">
                    {/* Toast messages */}
                    {error && (
                        <div className="toast toast-error">
                            <span>⚠️</span> {error}
                            <button className="toast-close" onClick={() => setError(null)}>✕</button>
                        </div>
                    )}
                    {success && (
                        <div className="toast toast-success">
                            <span>🎉</span> {success}
                            <button className="toast-close" onClick={() => setSuccess(null)}>✕</button>
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {loading && tickets.length === 0 && (
                        <div className="result-placeholder loading-pulse">
                            <div className="skeleton-line w80" />
                            <div className="skeleton-line w60" />
                            <div className="skeleton-line w90" />
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && tickets.length === 0 && !error && (
                        <div className="result-placeholder">
                            <div className="placeholder-icon">🎬</div>
                            <h3>Chưa có vé nào</h3>
                            <p>Quét mã QR hoặc nhập mã thủ công để bắt đầu soát vé</p>
                        </div>
                    )}

                    {/* Ticket results */}
                    {tickets.length > 0 && (
                        <div className="ticket-results-card">
                            <div className="result-card-header">
                                <h2>
                                    Kết quả ({tickets.length} vé)
                                </h2>
                                <button className="btn-reset" onClick={handleReset}>
                                    🔄 Quét mới
                                </button>
                            </div>

                            {/* Info summary from first ticket */}
                            {tickets[0] && (
                                <div className="ticket-info-summary">
                                    <div className="info-chip">
                                        <span className="chip-label">🎬 Phim</span>
                                        <span className="chip-value">{tickets[0].movieTitle || "—"}</span>
                                    </div>
                                    <div className="info-chip">
                                        <span className="chip-label">🏠 Phòng</span>
                                        <span className="chip-value">{tickets[0].roomName || "—"}</span>
                                    </div>
                                    <div className="info-chip">
                                        <span className="chip-label">🕐 Suất</span>
                                        <span className="chip-value">{formatDateTime(tickets[0].startTime)}</span>
                                    </div>
                                    <div className="info-chip">
                                        <span className="chip-label">👤 Khách</span>
                                        <span className="chip-value">{tickets[0].customerDisplay || "Khách lẻ"}</span>
                                    </div>
                                </div>
                            )}

                            {/* Combo section */}
                            {tickets[0] && tickets[0].comboItems && tickets[0].comboItems.length > 0 && (
                                <div className="staff-combo-section">
                                    <div className="staff-combo-header">
                                        <span className="staff-combo-label">🍿 Combo khách đã mua</span>
                                        {pendingCombos.length > 0 && (
                                            <button
                                                className="btn-combo-pickup"
                                                onClick={handleComboPickup}
                                                disabled={loading || selectedCombos.length === 0}
                                            >
                                                {loading ? "⏳ Đang xử lý..." : `✅ Xác nhận giao ${selectedCombos.length > 0 ? `(${selectedCombos.length})` : ''}`}
                                            </button>
                                        )}
                                    </div>
                                    <div className="staff-combo-list">
                                        {tickets[0].comboItems.map((item) => (
                                            <label
                                                key={item.id}
                                                className={`staff-combo-item ${item.pickedUp ? 'picked-up' : ''}`}
                                            >
                                                {item.pickedUp ? (
                                                    <span className="combo-status-icon">✓</span>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCombos.includes(item.id)}
                                                        onChange={() => toggleCombo(item.id)}
                                                    />
                                                )}
                                                <span className="staff-combo-name">{item.quantity}x {item.comboName}</span>
                                                {item.pickedUp && <span className="combo-badge-picked">Đã nhận</span>}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ticket table */}
                            <div className="ticket-table-wrapper">
                                <table className="ticket-table">
                                    <thead>
                                        <tr>
                                            <th className="th-check">
                                                {checkableTickets.length > 0 && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.length === checkableTickets.length && checkableTickets.length > 0}
                                                        onChange={toggleAll}
                                                    />
                                                )}
                                            </th>
                                            <th>Ghế</th>
                                            <th>Loại</th>
                                            <th>Trạng thái</th>
                                            <th>Kết quả</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tickets.map((t) => (
                                            <tr key={t.ticketId} className={t.canCheckIn ? "row-ok" : "row-warn"}>
                                                <td className="td-check">
                                                    {t.canCheckIn ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.includes(t.ticketId)}
                                                            onChange={() => toggleOne(t.ticketId)}
                                                        />
                                                    ) : (
                                                        <span className="no-check">—</span>
                                                    )}
                                                </td>
                                                <td className="td-seat">
                                                    <strong>{t.seatCode}</strong>
                                                </td>
                                                <td>
                                                    <span className={`seat-type-badge ${(t.seatType || "").toLowerCase()}`}>
                                                        {t.seatType || "—"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${(t.ticketStatus || "").toLowerCase()}`}>
                                                        {t.ticketStatus}
                                                    </span>
                                                </td>
                                                <td className="td-message">
                                                    <div className="message-action-wrapper">
                                                        <span className="message-text">{t.message}</span>
                                                        {t.canCheckIn && (
                                                            <button
                                                                className="btn-checkin-single"
                                                                onClick={() => handleCheckIn([t.ticketId])}
                                                                disabled={loading}
                                                            >
                                                                ✅ Soát
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Check-in action */}
                            {checkableTickets.length > 0 && (
                                <div className="checkin-action-bar">
                                    <span className="checkin-count">
                                        Đã chọn <strong>{selected.length}</strong> / {checkableTickets.length} vé hợp lệ
                                    </span>
                                    <button
                                        className="btn-checkin"
                                        onClick={() => handleCheckIn(selected)}
                                        disabled={loading || selected.length === 0}
                                    >
                                        {loading ? "⏳ Đang xử lý..." : `✅ Xác nhận Check-in (${selected.length})`}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
