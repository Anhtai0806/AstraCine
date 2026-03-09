import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Spin, Empty, message } from 'antd';
import { comboAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './ComboMenu.css';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const ComboMenu = () => {
    const { showtimeId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Kiểm tra authentication
    useEffect(() => {
        if (!user) {
            navigate("/login", {
                state: { returnUrl: `/booking/showtimes/${showtimeId}` },
            });
            return;
        }
    }, [user, navigate, showtimeId]);

    // Nhận state từ SeatSelection (hoặc từ InvoiceSummary khi quay lại)
    const {
        holdId,
        seatDetails = [],
        seatTotal = 0,
        movieTitle,
        startTime,
        endTime,
        roomName,
        cartItems: restoredCartItems, // có khi quay lại từ InvoiceSummary
    } = location.state || {};

    // --- STATE ---
    const [combos, setCombos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    // Khôi phục giỏ hàng nếu quay lại từ InvoiceSummary
    const [cart, setCart] = useState(() => {
        if (restoredCartItems?.length) {
            return Object.fromEntries(restoredCartItems.map(item => [item.id, item.quantity]));
        }
        return {};
    });

    // --- API ---
    const fetchCombos = async (kw = keyword) => {
        setLoading(true);
        try {
            const response = await comboAPI.search(kw, 0, 2000000);
            setCombos(response.data || []);
        } catch (error) {
            console.error('Lỗi tải combo:', error);
            message.error('Không thể tải danh sách bắp nước!');
        }
        setLoading(false);
    };

    useEffect(() => { fetchCombos(''); }, []);

    // --- CART LOGIC ---
    const addToCart = (combo) => {
        setCart(prev => ({ ...prev, [combo.id]: (prev[combo.id] || 0) + 1 }));
    };

    const removeFromCart = (comboId) => {
        setCart(prev => {
            const next = { ...prev };
            if ((next[comboId] || 0) <= 1) delete next[comboId];
            else next[comboId] -= 1;
            return next;
        });
    };

    // --- TÍNH TIỀN ---
    const cartItems = combos
        .filter(c => cart[c.id] > 0)
        .map(c => ({ ...c, quantity: cart[c.id], subtotal: c.price * cart[c.id] }));

    const comboTotal = cartItems.reduce((sum, i) => sum + i.subtotal, 0);
    const grandTotal = seatTotal + comboTotal;

    // --- FILTERED COMBOS ---
    const filtered = combos.filter(c =>
        c.name?.toLowerCase().includes(keyword.toLowerCase())
    );

    // --- NAVIGATION ---
    const handleGoBack = () => {
        // Truyền lại thông tin ghế để SeatSelection khôi phục
        navigate(`/booking/showtimes/${showtimeId}`, {
            state: {
                movieTitle,
                startTime,
                endTime,
                roomName,
                restoredHoldId: holdId,
                restoredSeatIds: seatDetails.map(s => s.seatId),
            },
        });
    };

    const handleContinue = () => {
        if (!holdId) {
            message.warning('Phiên đặt vé đã hết hạn, vui lòng chọn ghế lại.');
            navigate(`/booking/showtimes/${showtimeId}`);
            return;
        }
        navigate(`/booking/showtimes/${showtimeId}/invoice`, {
            state: {
                holdId,
                showtimeId,
                seatDetails,
                seatTotal,
                cartItems,
                comboTotal,
                grandTotal,
                movieTitle,
                startTime,
                endTime,
                roomName,
            },
        });
    };

    return (
        <div className="combo-page">
            {/* Breadcrumb */}
            <div className="booking-steps">
                <span className="step done">1. Chọn ghế</span>
                <span className="step-arrow">›</span>
                <span className="step active">2. Chọn bắp nước</span>
                <span className="step-arrow">›</span>
                <span className="step">3. Tóm tắt hoá đơn</span>
                <span className="step-arrow">›</span>
                <span className="step">4. Thanh toán</span>
            </div>

            <h1 className="combo-page-title">Chọn Bắp Nước</h1>

            <div className="combo-layout">
                {/* ===== LEFT: Combo List ===== */}
                <div className="combo-main">
                    {/* Search bar */}
                    <div className="combo-search-bar">
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Tìm kiếm combo bắp nước..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="combo-search-input"
                        />
                        {keyword && (
                            <button className="search-clear" onClick={() => setKeyword('')}>✕</button>
                        )}
                    </div>

                    {/* Combo grid */}
                    {loading ? (
                        <div className="combo-loading">
                            <Spin size="large" tip="Đang tải..." />
                        </div>
                    ) : filtered.length === 0 ? (
                        <Empty description={<span className="empty-text">Không tìm thấy combo phù hợp</span>} />
                    ) : (
                        <div className="combo-grid">
                            {filtered.map((item) => {
                                const qty = cart[item.id] || 0;
                                const isActive = item.status === 'ACTIVE';
                                return (
                                    <div
                                        key={item.id}
                                        className={`combo-card ${qty > 0 ? 'in-cart' : ''} ${!isActive ? 'out-of-stock' : ''}`}
                                    >
                                        <div className="combo-img-box">
                                            <img
                                                alt={item.name}
                                                src="https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400&auto=format&fit=crop"
                                            />
                                            <span className="price-badge">{formatCurrency(item.price)}</span>
                                            {!isActive && <span className="sold-out-overlay">Hết hàng</span>}
                                            {qty > 0 && <span className="cart-qty-badge">{qty}</span>}
                                        </div>
                                        <div className="combo-card-body">
                                            <h4 className="combo-name">{item.name}</h4>
                                            <div className="combo-card-actions">
                                                {qty === 0 ? (
                                                    <button
                                                        className="btn-add-to-cart"
                                                        disabled={!isActive}
                                                        onClick={() => addToCart(item)}
                                                    >
                                                        + Thêm vào giỏ
                                                    </button>
                                                ) : (
                                                    <div className="qty-control">
                                                        <button onClick={() => removeFromCart(item.id)}>−</button>
                                                        <span>{qty}</span>
                                                        <button onClick={() => addToCart(item)}>+</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ===== RIGHT: Order Summary Sidebar ===== */}
                <aside className="order-summary">
                    <h3 className="summary-title">Tóm tắt đơn hàng</h3>

                    {/* Ghế */}
                    <div className="summary-section">
                        <div className="summary-section-header">
                            <span>🎬 Ghế đã chọn</span>
                            <span
                                className="summary-edit-link"
                                onClick={() => navigate(`/booking/showtimes/${showtimeId}`)}
                            >
                                Đổi ghế
                            </span>
                        </div>
                        {seatDetails.length === 0 ? (
                            <p className="summary-empty">Chưa có ghế nào</p>
                        ) : (
                            <div className="summary-items">
                                {seatDetails
                                    .slice()
                                    .sort((a, b) => a.code.localeCompare(b.code))
                                    .map(s => (
                                        <div className="summary-row" key={s.seatId}>
                                            <span>
                                                <span className="seat-code-sm">{s.code}</span>
                                                <span className="seat-type-sm">{s.seatType}</span>
                                            </span>
                                            <span className="row-price">{formatCurrency(s.finalPrice)}</span>
                                        </div>
                                    ))}
                                <div className="summary-subtotal">
                                    <span>Tạm tính ghế</span>
                                    <span>{formatCurrency(seatTotal)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Combo */}
                    <div className="summary-section">
                        <div className="summary-section-header">
                            <span>🍿 Bắp nước</span>
                        </div>
                        {cartItems.length === 0 ? (
                            <p className="summary-empty">Chưa chọn bắp nước nào</p>
                        ) : (
                            <div className="summary-items">
                                {cartItems.map(item => (
                                    <div className="summary-row" key={item.id}>
                                        <span>
                                            <span className="combo-qty-sm">x{item.quantity}</span>
                                            {item.name}
                                        </span>
                                        <span className="row-price">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                ))}
                                <div className="summary-subtotal">
                                    <span>Tạm tính bắp nước</span>
                                    <span>{formatCurrency(comboTotal)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grand total */}
                    <div className="summary-grand-total">
                        <span>Tổng cộng</span>
                        <span className="grand-total-amount">{formatCurrency(grandTotal)}</span>
                    </div>

                    <button className="btn-continue" onClick={handleContinue}>
                        Tiếp tục →
                    </button>

                    <button className="btn-back" onClick={handleGoBack}>
                        ← Quay lại
                    </button>
                </aside>
            </div>
        </div>
    );
};

export default ComboMenu;