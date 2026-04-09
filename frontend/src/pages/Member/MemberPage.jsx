import React, { useEffect, useState } from "react";
import { memberApi } from "../../api/memberApi";
import { useAuth } from "../../contexts/AuthContext";
import "./MemberPage.css";

export default function MemberPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("overview");

    useEffect(() => {
        if (!user) return;
        const userId = user.id || user.userId;
        if (!userId) { setLoading(false); return; }

        memberApi.getProfile(userId)
            .then(res => { setData(res.data); setLoading(false); })
            .catch(err => { console.error("API ERROR:", err); setLoading(false); });
    }, [user]);

    if (loading) return (
        <div className="mp-loading">
            <div className="mp-spinner" />
            <span>Đang tải thông tin...</span>
        </div>
    );
    if (!data) return (
        <div className="mp-loading">
            <span>Không có dữ liệu thành viên.</span>
        </div>
    );

    const totalSpent = data.totalSpent ?? data.total_spent ?? 0;
    const nextLevelMinSpent = data.nextLevelMinSpent ?? data.next_level_min_spent ?? 0;
    const points = data.points ?? 0;
    const membership = data.membership || "STANDARD";
    const isMaxTier = !data.nextLevel || membership === "VVIP";
    const remaining = Math.max(nextLevelMinSpent - totalSpent, 0);
    const progress = isMaxTier ? 100 : (nextLevelMinSpent ? Math.min((totalSpent / nextLevelMinSpent) * 100, 100) : 0);

    const TABS = [
        { key: "overview", label: "Tổng quan" },
        { key: "points", label: "Điểm tích lũy" },
        { key: "benefits", label: "Quyền lợi" },
        { key: "history", label: "Lịch sử" },
    ];

    const TIERS = [
        { name: "Standard", min: "0 đ", perks: "Tích điểm cơ bản · 1 điểm / 10.000 đ" },
        { name: "VIP", min: "10,000,000 đ", perks: "Giảm giá vé, combo · Tích điểm ×1.5" },
        { name: "VVIP", min: "25,000,000 đ", perks: "Ưu tiên đặt chỗ · Quà sinh nhật · ×2" },
    ];

    const renderContent = () => {
        switch (tab) {
            case "overview":
                return (
                    <div className="mp-card">
                        <p className="mp-card-title">Thông tin thẻ</p>
                        <div className="mp-grid2">
                            <div className="mp-info-group">
                                <div className="mp-info-item">
                                    <span className="mp-info-label">Số thẻ</span>
                                    <span className="mp-info-value">{data.cardNumber || "N/A"}</span>
                                </div>
                                <div className="mp-info-item">
                                    <span className="mp-info-label">Hạng hiện tại</span>
                                    <span className="mp-info-value">{membership}</span>
                                </div>
                                <div className="mp-info-item">
                                    <span className="mp-info-label">Ngày kích hoạt</span>
                                    <span className="mp-info-value">{data.activatedDate || "N/A"}</span>
                                </div>
                            </div>
                            <div className="mp-info-group">
                                <div className="mp-info-item">
                                    <span className="mp-info-label">Tổng chi tiêu</span>
                                    <span className="mp-info-value">{totalSpent.toLocaleString("vi-VN")} đ</span>
                                </div>
                                <div className="mp-info-item">
                                    <span className="mp-info-label">Điểm hiện có</span>
                                    <span className="mp-info-value">{points.toLocaleString("vi-VN")}</span>
                                </div>
                                <div className="mp-info-item">
                                    <span className="mp-info-label">Hạng tiếp theo</span>
                                    <span className="mp-info-value">{isMaxTier ? "Hạng tối đa" : (data.nextLevel || "VVIP")}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mp-progress-block">
                            <div className="mp-progress-labels">
                                <span>Tiến trình lên hạng</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="mp-track">
                                <div className="mp-fill" style={{ width: `${progress}%` }} />
                            </div>
                            {isMaxTier ? (
                                <p className="mp-progress-sub mp-progress-max">
                                    Bạn đang ở <strong>hạng cao nhất</strong> — cảm ơn vì sự đồng hành của bạn!
                                </p>
                            ) : (
                                <p className="mp-progress-sub">
                                    Còn&nbsp;
                                    <strong>{remaining.toLocaleString("vi-VN")} đ</strong>
                                    &nbsp;để đạt hạng&nbsp;
                                    <strong>{data.nextLevel || "VVIP"}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                );

            case "points":
                return (
                    <div className="mp-card">
                        <p className="mp-card-title">Điểm tích lũy</p>
                        <div className="mp-points-grid">
                            <div className="mp-pts-box">
                                <span className="mp-pts-label">Điểm hiện có</span>
                                <span className="mp-pts-num">{points.toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="mp-pts-box">
                                <span className="mp-pts-label">Quy đổi ước tính</span>
                                <span className="mp-pts-num">{(points * 1000).toLocaleString("vi-VN")} đ</span>
                            </div>
                        </div>
                        <p className="mp-note">Quy đổi: 1 điểm = 1.000 đ. Điểm dùng được tại quầy và thanh toán online.</p>
                    </div>
                );

            case "benefits":
                return (
                    <div className="mp-card">
                        <p className="mp-card-title">Quyền lợi theo hạng</p>
                        <table className="mp-table">
                            <thead>
                                <tr>
                                    <th>Hạng</th>
                                    <th>Chi tiêu tối thiểu</th>
                                    <th>Ưu đãi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TIERS.map(tier => (
                                    <tr key={tier.name} className={tier.name === membership ? "mp-row-active" : ""}>
                                        <td>
                                            <span className={`mp-tier-badge mp-tier-${tier.name.toLowerCase()}`}>
                                                {tier.name === "VVIP" && (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "inline-block", marginRight: "6px", verticalAlign: "middle" }}>
                                                        <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="#ffffff" fillOpacity="0.3" />
                                                        <path d="M12 2L8 9L12 12L16 9L12 2Z" fill="#ffffff" fillOpacity="0.5" />
                                                        <path d="M4 9L8 9L12 12L4 9Z" fill="#ffffff" fillOpacity="0.2" />
                                                        <path d="M20 9L16 9L12 12L20 9Z" fill="#ffffff" fillOpacity="0.2" />
                                                        <path d="M8 9L12 22L12 12L8 9Z" fill="#ffffff" fillOpacity="0.1" />
                                                        <path d="M16 9L12 22L12 12L16 9Z" fill="#ffffff" fillOpacity="0.1" />
                                                    </svg>
                                                )}
                                                {tier.name}
                                            </span>
                                        </td>
                                        <td>{tier.min}</td>
                                        <td>{tier.perks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case "history":
                return (
                    <div className="mp-card">
                        <p className="mp-card-title">Lịch sử điểm</p>
                        <table className="mp-table">
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Nội dung</th>
                                    <th style={{ textAlign: "right" }}>Điểm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.history && data.history.length > 0 ? (
                                    data.history.map((item, i) => (
                                        <tr key={i}>
                                            <td className="mp-date">{item.date || "—"}</td>
                                            <td>{item.description || "—"}</td>
                                            <td style={{ textAlign: "right" }}>
                                                <span className={item.points >= 0 ? "mp-pts-pos" : "mp-pts-neg"}>
                                                    {item.points >= 0 ? "+" : ""}{item.points ?? 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="mp-empty">Chưa có lịch sử điểm</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="mp-container">

            {/* HERO */}
            <div className="mp-hero">
                <div className="mp-hero-left">
                    <div className="mp-profile-head">
                        <div className="mp-avatar-container">
                            <div className="mp-avatar-frame">
                                {data.avatarUrl || user?.avatarUrl ? (
                                    <img src={data.avatarUrl || user.avatarUrl} alt="Avatar" className="mp-avatar-img" />
                                ) : (
                                    <svg className="mp-avatar-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <div className="mp-profile-info">
                            <span className={`mp-badge mp-badge-${membership.toLowerCase()}`}>
                                {membership === "VVIP" ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: "6px" }}>
                                        <path d="M12 2L4 9L12 22L20 9L12 2Z" fill="#ffffff" fillOpacity="0.4" />
                                        <path d="M12 2L8 9L12 12L16 9L12 2Z" fill="#ffffff" fillOpacity="0.6" />
                                        <path d="M4 9L8 9L12 12L4 9Z" fill="#ffffff" fillOpacity="0.3" />
                                        <path d="M20 9L16 9L12 12L20 9Z" fill="#ffffff" fillOpacity="0.3" />
                                        <path d="M8 9L12 22L12 12L8 9Z" fill="#ffffff" fillOpacity="0.2" />
                                        <path d="M16 9L12 22L12 12L16 9Z" fill="#ffffff" fillOpacity="0.2" />
                                    </svg>
                                ) : (
                                    <span className="mp-badge-dot" />
                                )}
                                {membership}
                            </span>
                            <h2 className={`mp-name ${membership === "VVIP" ? "mp-name-vvip" : ""}`}>{data.name || "Thành viên"}</h2>
                            <p className="mp-card-no">Số thẻ: {data.cardNumber || "N/A"}</p>
                        </div>
                    </div>

                    <div className="mp-progress-block" style={{ marginTop: "1rem" }}>
                        <div className="mp-progress-labels">
                            <span>{totalSpent.toLocaleString("vi-VN")} đ</span>
                            <span>{nextLevelMinSpent.toLocaleString("vi-VN")} đ</span>
                        </div>
                        <div className="mp-track">
                            <div className="mp-fill" style={{ width: `${progress}%` }} />
                        </div>
                        {isMaxTier ? (
                            <p className="mp-progress-sub mp-progress-max">
                                Bạn đang ở <strong>hạng cao nhất</strong> — cảm ơn vì sự đồng hành của bạn!
                            </p>
                        ) : (
                            <p className="mp-progress-sub">
                                Còn&nbsp;<strong>{remaining.toLocaleString("vi-VN")} đ</strong>&nbsp;để lên hạng&nbsp;
                                <strong>{data.nextLevel}</strong>
                            </p>
                        )}
                    </div>
                </div>

                <div className="mp-hero-right">
                    <p className="mp-pts-hero-label">Điểm tích lũy</p>
                    <p className="mp-pts-hero-num">{points.toLocaleString("vi-VN")}</p>
                    <p className="mp-pts-hero-sub">≈ {(points * 1000).toLocaleString("vi-VN")} đ</p>
                </div>
            </div>

            {/* STATS */}
            <div className="mp-stats">
                <div className="mp-stat">
                    <span className="mp-stat-label">Tổng chi tiêu</span>
                    <span className="mp-stat-value">{(totalSpent / 1_000_000).toFixed(1)}M</span>
                    <span className="mp-stat-unit">đồng</span>
                </div>
                <div className="mp-stat">
                    <span className="mp-stat-label">Điểm hiện có</span>
                    <span className="mp-stat-value">{points.toLocaleString("vi-VN")}</span>
                    <span className="mp-stat-unit">điểm</span>
                </div>
                <div className="mp-stat">
                    <span className="mp-stat-label">Hạng thành viên</span>
                    <span className="mp-stat-value">{membership}</span>
                    <span className="mp-stat-unit">kể từ {data.activatedDate || "N/A"}</span>
                </div>
            </div>

            {/* TABS */}
            <div className="mp-tabs" role="tablist">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={tab === t.key}
                        className={`mp-tab${tab === t.key ? " mp-tab-active" : ""}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div role="tabpanel">
                {renderContent()}
            </div>
        </div>
    );
}