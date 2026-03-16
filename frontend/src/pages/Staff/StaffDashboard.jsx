import { useNavigate } from "react-router-dom";
import "./StaffDashboard.css";

export default function StaffDashboard() {
    const navigate = useNavigate();

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

                <div className="staff-feature-card muted">
                    <div className="staff-feature-icon">✅</div>
                    <h2>Soát vé QR</h2>
                    <p>
                        Đã dựng sẵn màn hình tra cứu và xác nhận mã vé. Sau khi phần gửi mail hoàn tất,
                        chỉ cần nối máy quét/camera là dùng được.
                    </p>
                    <button onClick={() => navigate("/staff/ticket-checkin")}>Mở màn hình soát vé</button>
                </div>
            </div>
        </div>
    );
}