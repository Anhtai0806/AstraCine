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

        if (!userId) {
            setLoading(false);
            return;
        }

        memberApi.getProfile(userId)
            .then(res => {
                console.log("DATA API:", res.data); // 👉 debug BE
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("API ERROR:", err);
                setLoading(false);
            });
    }, [user]);

    if (loading) return <div className="member-loading">Loading...</div>;
    if (!data) return <div className="member-loading">Không có dữ liệu</div>;

    // ✅ SAFE DATA (fix NaN toàn bộ)
    const totalSpent = data.totalSpent || data.total_spent || 0;
    const nextLevelMinSpent =
    data.nextLevelMinSpent ?? data.next_level_min_spent ?? 0;
    const points = data.points || 0;

    const remaining = Math.max(nextLevelMinSpent - totalSpent, 0);

    const progress = nextLevelMinSpent
        ? Math.min((totalSpent / nextLevelMinSpent) * 100, 100)
        : 0;

    // 👉 render tab content
    const renderContent = () => {
        switch (tab) {
            case "overview":
                return (
                    <div className="member-card">
                        <h3>Tổng quan thẻ</h3>

                        <div className="grid-2">
                            <div>
                                <p><strong>Số thẻ:</strong> {data.cardNumber || "N/A"}</p>
                                <p><strong>Hạng:</strong> {data.membership || "MEMBER"}</p>
                                <p><strong>Kích hoạt:</strong> {data.activatedDate || "N/A"}</p>
                            </div>

                            <div>
                                <p>
                                    <strong>Tổng chi tiêu:</strong>{" "}
                                    {totalSpent.toLocaleString()} đ
                                </p>
                                <p><strong>Điểm:</strong> {points}</p>
                            </div>
                        </div>

                        <div className="progress-box">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <p className="progress-text">
                                {totalSpent.toLocaleString()} /{" "}
                                {nextLevelMinSpent.toLocaleString()} đ
                            </p>

                            <p className="progress-next">
                                Còn {remaining.toLocaleString()} đ để lên{" "}
                                {data.nextLevel || "ELITE"}
                            </p>
                        </div>
                    </div>
                );

            case "points":
                return (
                    <div className="member-card">
                        <h3>Điểm tích lũy</h3>

                        <div className="points-box">
                            <div>
                                <p>Điểm hiện có</p>
                                <h2>{points}</h2>
                            </div>

                            <div>
                                <p>Quy đổi (ước tính)</p>
                                <h2>{(points * 1000).toLocaleString()} đ</h2>
                            </div>
                        </div>

                        <p className="note">
                            * Quy đổi: 1 điểm = 1.000đ 
                        </p>
                    </div>
                );

            case "benefits":
                return (
                    <div className="member-card">
                        <h3>Quyền lợi thành viên</h3>

                        <table className="benefit-table">
                            <thead>
                                <tr>
                                    <th>Hạng</th>
                                    <th>Ưu đãi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Standard</td>
                                    <td>Tích điểm cơ bản</td>
                                </tr>
                                <tr>
                                    <td>VIP</td>
                                    <td>Giảm giá vé + combo</td>
                                </tr>
                                <tr>
                                    <td>VVIP</td>
                                    <td>Ưu tiên + quà</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );

            case "history":
                return (
                    <div className="member-card">
                        <h3>Lịch sử điểm</h3>

                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Thời gian</th>
                                    <th>Điểm</th>
                                    <th>Nội dung</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.history && data.history.length > 0 ? (
                                    data.history.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.date || "-"}</td>
                                            <td>{item.points || 0}</td>
                                            <td>{item.description || "-"}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3">Không có dữ liệu</td>
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
        <div className="member-container">

            {/* HEADER */}
            <div className="member-header">
                <div>
                    <h2>{data.name || "Thẻ thành viên"}</h2>
                    <p className="member-level">
                        {data.membership || "MEMBER"}
                    </p>
                </div>

                <div className="member-points">
                    {points} điểm
                </div>
            </div>

            {/* TABS */}
            <div className="member-tabs">
                <button
                    className={tab === "overview" ? "active" : ""}
                    onClick={() => setTab("overview")}
                >
                    Tổng quan
                </button>

                <button
                    className={tab === "points" ? "active" : ""}
                    onClick={() => setTab("points")}
                >
                    Điểm tích lũy
                </button>

                <button
                    className={tab === "benefits" ? "active" : ""}
                    onClick={() => setTab("benefits")}
                >
                    Quyền lợi
                </button>

                <button
                    className={tab === "history" ? "active" : ""}
                    onClick={() => setTab("history")}
                >
                    Lịch sử
                </button>
            </div>

            {/* CONTENT */}
            {renderContent()}
        </div>
    );
}