import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StaffTicketScanner from "./StaffTicketScanner";
import "./StaffDashboard.css";

export default function StaffDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showScanner, setShowScanner] = useState(false);

    const roles = user?.roles || [];
    const position = (user?.staffPosition || "").toUpperCase().trim();
    const effectivePosition = position || (roles.includes("ROLE_ADMIN") ? "MULTI" : "");

    const canCounter = effectivePosition === "COUNTER" || effectivePosition === "MULTI";
    const canCheckin = effectivePosition === "CHECKIN" || effectivePosition === "MULTI";
    const canConcession =
        effectivePosition === "CONCESSION" ||
        effectivePosition === "MULTI" ||
        effectivePosition === "COUNTER";

    return (
        <div className="staff-dashboard-page">
            <div className="staff-hero-card">
                <div>
                    <div className="staff-hero-kicker">AstraCine Staff Portal</div>
                    <h1>Trung tâm nghiệp vụ cho nhân viên rạp</h1>
                    <p>
                        Luồng online vẫn được giữ nguyên. Tại đây nhân viên có thể bán vé tại quầy,
                        bán combo riêng và thực hiện nghiệp vụ soát vé bằng mã QR.
                    </p>
                </div>
            </div>

            {!effectivePosition && (
                <div className="staff-dashboard-alert">
                    Tài khoản của bạn chưa được admin gán vị trí làm việc. Hãy liên hệ quản trị viên để được cấp quyền đúng nghiệp vụ.
                </div>
            )}

            <div className="staff-dashboard-grid">
                <div className="staff-feature-card">
                    <div className="staff-feature-icon">🎟️</div>
                    <h2>Bán vé tại quầy</h2>
                    <p>
                        Chọn lịch chiếu, giữ ghế, thêm combo, áp mã giảm giá và chốt hóa đơn tại quầy
                        bằng tiền mặt hoặc thẻ.
                    </p>
                    <button onClick={() => navigate("/staff/booking")} disabled={!canCounter}>
                        Bắt đầu tạo đơn
                    </button>
                </div>

                <div className="staff-feature-card">
                    <div className="staff-feature-icon">🍿</div>
                    <h2>Bán combo riêng</h2>
                    <p>
                        Tạo hóa đơn chỉ gồm bắp nước hoặc combo quầy, không cần chọn vé hay suất chiếu.
                        Phù hợp cho khách mua thêm tại quầy.
                    </p>
                    <button onClick={() => navigate("/staff/combo-sales")} disabled={!canConcession}>
                        Mở bán combo
                    </button>
                </div>

                <div className={`staff-feature-card ${showScanner ? "active-scanner" : ""}`}>
                    <div className="staff-feature-icon">✅</div>
                    <h2>Soát vé QR</h2>
                    <p>
                        Quét mã QR hoặc nhập mã vé thủ công để tra cứu và xác nhận check-in cho khách hàng.
                    </p>

                    <div className="staff-feature-actions">
                        <button
                            onClick={() => navigate("/staff/ticket-checkin")}
                            disabled={!canCheckin}
                        >
                            Mở trang soát vé
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowScanner((prev) => !prev)}
                            disabled={!canCheckin}
                        >
                            {showScanner ? " Đóng soát vé" : " Mở scanner nhanh"}
                        </button>
                    </div>
                </div>
            </div>

            {showScanner && canCheckin && (
                <div className="inline-scanner-container">
                    <StaffTicketScanner />
                </div>
            )}
        </div>
    );
}