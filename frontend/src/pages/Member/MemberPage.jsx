import React, { useEffect, useState } from "react";
import { memberApi } from "../../api/memberApi";
import { useAuth } from "../../contexts/AuthContext";
import "./MemberPage.css";
// Lưu ý: Nếu giao diện thẻ voucher bị mất CSS, bạn hãy uncomment dòng dưới đây để import CSS từ trang News
// import "../NewsPromotions/NewsPromotions.css"; 

export default function MemberPage() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("overview");
    
    // 1. THÊM STATE LƯU TRỮ VOUCHER
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        if (!user) return;
        const userId = user.id || user.userId;
        if (!userId) { setLoading(false); return; }

        // Gọi API lấy thông tin Profile
        memberApi.getProfile(userId)
            .then(res => { setData(res.data); setLoading(false); })
            .catch(err => { console.error("API ERROR:", err); setLoading(false); });

        // 2. THÊM LỆNH GỌI API LẤY VÍ VOUCHER
        memberApi.getCoupons(userId)
            .then(res => setCoupons(res.data))
            .catch(err => console.error("API Coupon ERROR:", err));

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

    // 3. THÊM TAB "VÍ VOUCHER" VÀO DANH SÁCH MENU
    const TABS = [
        { key: "overview", label: "Tổng quan" },
        { key: "points", label: "Điểm tích lũy" },
        { key: "benefits", label: "Quyền lợi" },
        { key: "my_coupons", label: "Ví Voucher" },
    ];

    const TIERS = [
        { 
            name: "MEMBER", 
            min: "0 đ", 
            pointRate: [
                "Quầy vé: 5%", 
                "Quầy bắp nước: 3%"
            ],
            gifts: [] 
        },
        { 
            name: "ELITE", 
            min: "2.500.000 đ", 
            pointRate: [
                "Quầy vé: 5%", 
                "Quầy bắp nước: 3%"
            ],
            gifts: [
                "x2 Coupon giảm 50% vé phim (tối đa 100.000đ)",
                "x1 Coupon giảm 20% F&B (tối đa 50.000đ)"
            ]
        },
        { 
            name: "VIP", 
            min: "3.500.000 đ", 
            pointRate: [
                "Quầy vé: 7%", 
                "Quầy bắp nước: 4%"
            ],
            gifts: [
                "x2 Coupon giảm 100% vé phim (tối đa 100.000đ)",
                "x1 Coupon giảm 20% F&B (tối đa 50.000đ)",
                "x1 Coupon giảm 30% F&B (tối đa 80.000đ)"
            ]
        },
        { 
            name: "VVIP", 
            min: "6.500.000 đ", 
            pointRate: [
                "Quầy vé: 10%", 
                "Quầy bắp nước: 5%"
            ],
            gifts: [
                "x6 Coupon giảm 100% vé phim (tối đa 100.000đ)",
                "x1 Coupon giảm 20% F&B (tối đa 50.000đ)",
                "x1 Coupon giảm 30% F&B (tối đa 80.000đ)",
                "x1 Coupon giảm 50% F&B (tối đa 150.000đ)"
            ]
        },
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
                                    <th style={{ width: "20%" }}>Hạng</th>
                                    <th style={{ width: "20%" }}>Điều kiện</th>
                                    <th style={{ width: "60%" }}>Chi tiết ưu đãi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TIERS.map(tier => (
                                    <tr key={tier.name} className={tier.name === membership ? "mp-row-active" : ""}>
                                        <td style={{ verticalAlign: "top", paddingTop: "16px" }}>
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
                                        <td style={{ verticalAlign: "top", paddingTop: "16px" }}>
                                            <span className="mp-benefit-condition">{tier.min}</span>
                                        </td>
                                        <td style={{ verticalAlign: "top", paddingTop: "16px", paddingBottom: "16px" }}>
                                            
                                            <div style={{ marginBottom: tier.gifts.length > 0 ? "12px" : "0" }}>
                                                <div className="mp-benefit-title">
                                                    ⭐ Tỉ lệ tích điểm
                                                </div>
                                                <ul className="mp-benefit-list">
                                                    {tier.pointRate.map((rate, idx) => (
                                                        <li key={idx}>{rate}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {tier.gifts.length > 0 && (
                                                <div>
                                                    <div className="mp-benefit-title">
                                                        🎁 Quà tặng nâng hạng
                                                    </div>
                                                    <ul className="mp-benefit-list">
                                                        {tier.gifts.map((gift, idx) => (
                                                            <li key={idx}>{gift}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            
            // 4. GIAO DIỆN TAB VÍ VOUCHER SỬ DỤNG CSS CỦA TRANG NEWS
            case "my_coupons":
                return (
                    <div className="mp-card">
                        <p className="mp-card-title">Ví Voucher Của Tôi</p>
                        
                        {coupons.length === 0 ? (
                            <div className="mp-empty">
                                Bạn chưa có voucher nào trong ví. Hãy tích lũy thêm chi tiêu để thăng hạng và nhận quà nhé!
                            </div>
                        ) : (
                            <div className="promo-grid">
                                {coupons.map((cp) => {
                                    // Xác định màu sắc dựa theo loại voucher (Vé hay Bắp nước)
                                    const typeClass = cp.targetType === 'TICKET' ? 'percentage' : 'fixed';
                                    
                                    return (
                                        <div className="promo-card" key={cp.id}>
                                            <div className="promo-card-glow" />
                                            <div className="promo-card-top">
                                                <div className={`promo-card-badge ${typeClass}`}>
                                                    {cp.targetType === 'TICKET' ? '🎟️ Vé phim' : '🍿 Bắp nước'}
                                                </div>
                                                
                                                <div className={`promo-discount-value ${typeClass}`}>
                                                    -{cp.discountPercent}%
                                                </div>
                                                
                                                <div className="promo-discount-label">
                                                    Giảm tối đa {cp.maxDiscountAmount?.toLocaleString("vi-VN") || 0}đ
                                                </div>
                                            </div>
                                            
                                            <hr className="promo-card-dashed" />
                                            
                                            <div className="promo-card-bottom">
                                                <div className="promo-code-box">
                                                    <div className="promo-code-display" style={{letterSpacing: "2px", fontWeight: "bold"}}>
                                                        {cp.code}
                                                    </div>
                                                    <button 
                                                        className={`promo-code-copy ${cp.isUsed ? "copied" : ""}`} 
                                                        disabled={cp.isUsed}
                                                        style={{cursor: cp.isUsed ? "not-allowed" : "pointer"}}
                                                    >
                                                        {cp.isUsed ? "Đã dùng" : "Dùng ngay"}
                                                    </button>
                                                </div>
                                                <div className="promo-meta">
                                                    <div className="promo-meta-item">
                                                        Hạn dùng: {new Date(cp.expiredAt).toLocaleDateString('vi-VN')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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