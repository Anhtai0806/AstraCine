import { useRef, useState } from "react";
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
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const runLookup = async () => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const response = await staffApi.lookupTicket(code.trim());
            setResult(response);
        } catch (err) {
            setResult(null);
            setError(err?.message || "Không tìm thấy vé.");
        } finally {
            setLoading(false);
        }
    };

    const runCheckIn = async () => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const response = await staffApi.checkInTicket(code.trim());
            setResult(response);
        } catch (err) {
            setError(err?.message || "Không thể soát vé.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="staff-scanner-page">
            <div className="staff-scanner-header">
                <div>
                    <div className="staff-kicker">Soát vé QR</div>
                    <h1>Màn hình soát vé cho nhân viên cửa vào</h1>
                    <p>
                        Có thể dùng máy quét QR dạng USB/Bluetooth như bàn phím để quét trực tiếp vào ô bên dưới.
                        Khi phần gửi mail hoàn tất, mã QR trong mail sẽ dùng lại đúng API này.
                    </p>
                </div>
            </div>

            <div className="staff-scanner-card">
                <div className="staff-scan-input-row">
                    <input
                        ref={inputRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Quét hoặc nhập mã QR / ticket code..."
                        onKeyDown={(e) => e.key === "Enter" && runLookup()}
                    />
                    <button onClick={runLookup} disabled={loading || !code.trim()}>
                        {loading ? "..." : "Tra cứu"}
                    </button>
                    <button className="secondary" onClick={runCheckIn} disabled={loading || !code.trim()}>
                        Xác nhận soát vé
                    </button>
                </div>

                <div className="staff-scan-note">
                    Gợi ý vận hành: đặt con trỏ sẵn trong ô nhập, máy quét QR sẽ tự bắn mã vào ô và nhân viên chỉ cần nhấn Enter hoặc bấm “Xác nhận soát vé”.
                </div>

                {error && <div className="staff-scan-error">⚠️ {error}</div>}

                {result && (
                    <div className={`staff-ticket-result ${result.canCheckIn ? "ok" : "warn"}`}>
                        <div className="staff-ticket-result-head">
                            <div>
                                <span className="result-label">Mã vé</span>
                                <h2>{result.ticketCode}</h2>
                            </div>
                            <div className={`result-status ${result.ticketStatus?.toLowerCase()}`}>
                                {result.ticketStatus}
                            </div>
                        </div>

                        <p className="result-message">{result.message}</p>

                        <div className="staff-ticket-result-grid">
                            <div><span>Khách</span><strong>{result.customerDisplay || "Khách lẻ"}</strong></div>
                            <div><span>Phim</span><strong>{result.movieTitle || "—"}</strong></div>
                            <div><span>Phòng / ghế</span><strong>{result.roomName || "—"} · {result.seatCode || "—"}</strong></div>
                            <div><span>Suất chiếu</span><strong>{formatDateTime(result.startTime)}</strong></div>
                            <div><span>Invoice</span><strong>#{result.invoiceId}</strong></div>
                            <div><span>Loại ghế</span><strong>{result.seatType || "—"}</strong></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
