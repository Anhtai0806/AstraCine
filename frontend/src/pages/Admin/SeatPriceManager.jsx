import React, { useState, useEffect } from "react";
import { seatPriceService } from "../../services/seatPriceService";
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
} from "react-icons/ri";
import "./SeatPriceManager.css";

const SEAT_META = {
    NORMAL: { icon: <RiArmchairFill />, cls: "normal", label: "Ghế thường", desc: "Hàng tiêu chuẩn" },
    VIP: { icon: <RiVipCrownFill />, cls: "vip", label: "Ghế VIP", desc: "Hàng giữa, ưu tiên" },
    PREMIUM: { icon: <RiVipDiamondFill />, cls: "premium", label: "Ghế Premium", desc: "Hàng đầu, rộng rãi" },
    COUPLE: { icon: <RiHeartFill />, cls: "couple", label: "Ghế đôi", desc: "Cặp đôi, ghế liền" },
};

const SeatPriceManager = () => {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => { fetchPrices(); }, []);

    const fetchPrices = async () => {
        try {
            setLoading(true);
            const res = await seatPriceService.getAll();
            setPrices(res.data);
        } catch (err) {
            setError("Không thể tải danh sách giá ghế.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePriceChange = (type, value) => {
        // Loại bỏ tất cả ký tự không phải số (bao gồm dấu chấm phân cách)
        const numericString = value.replace(/\D/g, "");
        const numericValue = numericString === "" ? 0 : parseInt(numericString, 10);
        
        setPrices(prev =>
            prev.map(p => p.seatType === type ? { ...p, basePrice: numericValue } : p)
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccessMsg("");
            await seatPriceService.update(prices);
            setSuccessMsg("Cập nhật giá ghế thành công!");
            setTimeout(() => setSuccessMsg(""), 3500);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Không thể lưu thay đổi.";
            setError(msg);
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="seat-price-manager">
            <div className="loading-state">
                <RiRefreshLine className="spinner" />
                <p>Đang tải dữ liệu...</p>
            </div>
        </div>
    );

    return (
        <div className="seat-price-manager">

            {/* Header */}
            <header className="manager-header">
                <div className="header-info">
                    <h1>Giá ghế</h1>
                    <p>Cấu hình mức giá cơ bản cho từng loại ghế</p>
                </div>
                <button className="save-button" onClick={handleSave} disabled={saving}>
                    {saving
                        ? <><RiRefreshLine className="spinner" /> Đang lưu...</>
                        : <><RiSave3Fill /> Lưu thay đổi</>
                    }
                </button>
            </header>

            {/* Alerts */}
            {error && (
                <div className="message-alert error">
                    <RiErrorWarningLine />
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="message-alert success">
                    <RiCheckboxCircleLine />
                    {successMsg}
                </div>
            )}

            {/* Table */}
            <table className="price-table">
                <thead>
                    <tr>
                        <th>Loại ghế</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: "right" }}>Giá cơ bản</th>
                    </tr>
                </thead>
                <tbody>
                    {prices.map(item => {
                        const meta = SEAT_META[item.seatType] || {
                            icon: <RiArmchairFill />,
                            cls: "normal",
                            label: item.seatType,
                            desc: "",
                        };
                        return (
                            <tr key={item.seatType}>
                                <td>
                                    <div className="seat-type-cell">
                                        <div className={`seat-icon-wrap ${meta.cls}`}>
                                            {meta.icon}
                                        </div>
                                        <div className="seat-type-info">
                                            <strong>{meta.label}</strong>
                                            <span>{meta.desc}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="status-cell">
                                    <span className="status-badge active">Đang dùng</span>
                                </td>
                                <td className="price-cell">
                                    <div className="price-input-row">
                                        <input
                                            type="text"
                                            value={item.basePrice.toLocaleString("vi-VN")}
                                            onChange={e => handlePriceChange(item.seatType, e.target.value)}
                                            placeholder="0"
                                        />
                                        <span className="unit">VND</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Notice */}
            <div className="manager-notice">
                <RiInformationLine className="notice-icon" />
                <p>
                    Thay đổi giá chỉ áp dụng cho các <strong>suất chiếu khởi tạo sau này</strong>.
                    Các suất chiếu hiện có sẽ giữ nguyên giá để đảm bảo nhất quán cho khách đã mua vé.
                </p>
            </div>
        </div>
    );
};

export default SeatPriceManager;