import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StaffTicketScanner from "./StaffTicketScanner";
import "./StaffDashboard.css";

export default function StaffDashboard() {
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);

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

            <div className="staff-dashboard-grid">
                <div className="staff-feature-card">
                    <div className="staff-feature-icon">🎟️</div>
                    <h2>Bán vé tại quầy</h2>
                    <p>
                        Chọn lịch chiếu, giữ ghế, thêm combo, áp mã giảm giá và chốt hóa đơn tại quầy
                        bằng tiền mặt hoặc thẻ.
                    </p>
                    <button onClick={() => navigate("/staff/booking")}>Bắt đầu tạo đơn</button>
                </div>

                <div className="staff-feature-card">
                    <div className="staff-feature-icon">🍿</div>
                    <h2>Bán combo riêng</h2>
                    <p>
                        Tạo hóa đơn chỉ gồm bắp nước hoặc combo quầy, không cần chọn vé hay suất chiếu.
                        Phù hợp cho khách mua thêm tại quầy.
                    </p>
                    <button onClick={() => navigate("/staff/combo-sales")}>Mở bán combo</button>
                </div>

                <div className={`staff-feature-card ${showScanner ? "active-scanner" : ""}`}>
                    <div className="staff-feature-icon">✅</div>
                    <h2>Soát vé QR</h2>
                    <p>
                        Quét mã QR hoặc nhập mã vé thủ công để tra cứu và xác nhận check-in cho khách hàng.
                    </p>
                    <button onClick={() => setShowScanner(!showScanner)}>
                        {showScanner ? "🔽 Đóng soát vé" : "📷 Mở màn hình soát vé"}
                    </button>
                </div>
            </div>

            {/* Inline QR Scanner */}
            {showScanner && (
                <div className="inline-scanner-container">
                    <StaffTicketScanner />
                </div>
            )}
        </div>
    );
}