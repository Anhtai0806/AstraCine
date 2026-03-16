import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvoices } from '../../api/invoiceApi';
import './OrderHistory.css';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
};

const OrderHistory = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState({}); // { [invoiceId]: bool }

  useEffect(() => {
        console.log("1. Bắt đầu gọi API getMyInvoices..."); // Bẫy 1: Xem có lọt vào useEffect không

        getMyInvoices()
            .then(data => {
                // Bẫy 2: Nếu API thành công, nó PHẢI vào đây
                console.log("2. 👉 THÀNH CÔNG! Dữ liệu hóa đơn từ API:", data); 
                setInvoices(data || []);
            })
            .catch(err => {
                // Bẫy 3: Nếu API thất bại (lỗi 403, 404, 500...), nó sẽ nhảy thẳng vào đây
                console.error("3. ❌ LỖI RỒI! API thất bại:", err); 
                setError(err?.message || 'Không thể tải lịch sử mua hàng.');
            })
            .finally(() => {
                // Bẫy 4: Kiểu gì cũng phải chạy qua đây cuối cùng
                console.log("4. Đã chạy xong hàm finally, tắt loading.");
                setLoading(false);
            });
    }, []);
    const toggleExpand = (id) =>
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading) return (
        <div className="oh-page">
            <div className="oh-container">
                <div className="oh-loading">
                    <div className="oh-spinner" />
                    <span>Đang tải lịch sử mua hàng...</span>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div className="oh-page">
            <div className="oh-container">
                <div className="oh-error">⚠️ {error}</div>
            </div>
        </div>
    );

    return (
        <div className="oh-page">
            <div className="oh-container">
                {/* Header */}
                <div className="oh-header">
                    <span className="oh-header-icon">🎟️</span>
                    <div>
                        <h1 className="oh-title">Lịch Sử Mua Hàng</h1>
                        <p className="oh-subtitle">
                            {invoices.length > 0
                                ? `${invoices.length} đơn hàng`
                                : 'Chưa có đơn hàng nào'}
                        </p>
                    </div>
                </div>

                {/* Empty state */}
                {invoices.length === 0 && (
                    <div className="oh-empty">
                        <div className="oh-empty-icon">🎬</div>
                        <p>Bạn chưa mua vé xem phim nào.</p>
                        <button className="oh-btn-browse" onClick={() => navigate('/movies')}>
                            Khám phá phim ngay
                        </button>
                    </div>
                )}

                {/* Invoice list */}
                {invoices.map(inv => {
                    const isOpen = !!expanded[inv.invoiceId];
                    const statusClass = inv.status === 'PAID' ? 'paid' : 'other';
                    const statusLabel = inv.status === 'PAID' ? 'Đã thanh toán' : inv.status;
                    const hasCombos = inv.combos && inv.combos.length > 0;
                    const hasSeats = inv.seats && inv.seats.length > 0;

                    return (
                        <div key={inv.invoiceId} className="oh-card">
                            {/* ── Card header ── */}
                            <div className="oh-card-header" onClick={() => toggleExpand(inv.invoiceId)}>
                                {/* Poster */}
                                <div className="oh-poster-wrap">
                                    {inv.moviePosterUrl ? (
                                        <img
                                            className="oh-poster"
                                            src={inv.moviePosterUrl}
                                            alt={inv.movieTitle || 'Poster'}
                                            onError={e => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="oh-poster-placeholder">🎬</div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="oh-card-info">
                                    <p className="oh-movie-title">{inv.movieTitle || 'Phim không xác định'}</p>
                                    <div className="oh-meta">
                                        {inv.startTime && (
                                            <span>🕐 {formatDateTime(inv.startTime)}</span>
                                        )}
                                        {inv.roomName && (
                                            <span>🏛️ {inv.roomName}</span>
                                        )}
                                        {hasSeats && (
                                            <span>💺 {inv.seats.map(s => s.seatCode).join(', ')}</span>
                                        )}
                                        <span>📅 Mua: {formatDate(inv.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Right: amount + status + toggle */}
                                <div className="oh-card-right">
                                    <span className="oh-amount">{formatCurrency(inv.totalAmount)}</span>
                                    <span className={`oh-status ${statusClass}`}>{statusLabel}</span>
                                    <span className={`oh-expand-icon${isOpen ? ' open' : ''}`}>▼</span>
                                </div>
                            </div>

                            {/* ── Card detail (expandable) ── */}
                            {isOpen && (
                                <div className="oh-card-detail">
                                    {/* Seats */}
                                    {hasSeats && (
                                        <>
                                            <p className="oh-section-label">💺 Ghế đã đặt</p>
                                            <div className="oh-seats-grid">
                                                {inv.seats.map((seat, i) => (
                                                    <div key={i} className="oh-seat-tag">
                                                        <span className="oh-seat-code">{seat.seatCode}</span>
                                                        <span className="oh-seat-type">{seat.seatType?.toLowerCase() || ''}</span>
                                                        <span className="oh-seat-price">{formatCurrency(seat.price)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Combos */}
                                    {hasCombos && (
                                        <>
                                            <p className="oh-section-label">🍿 Bắp nước</p>
                                            <div className="oh-combos-list">
                                                {inv.combos.map((combo, i) => (
                                                    <div key={i} className="oh-combo-row">
                                                        <div className="oh-combo-left">
                                                            <span className="oh-combo-qty">×{combo.quantity}</span>
                                                            <span>{combo.comboName}</span>
                                                        </div>
                                                        <span className="oh-combo-price">
                                                            {formatCurrency(combo.price)} / cái
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {/* Total */}
                                    <hr className="oh-divider" />
                                    <div className="oh-total-row">
                                        <span className="oh-total-label">Tổng thanh toán</span>
                                        <span className="oh-total-amount">{formatCurrency(inv.totalAmount)}</span>
                                    </div>
                                    {/* 🔥 THÊM NÚT XEM VÉ Ở ĐÂY */}
                                    {inv.status === 'PAID' && (
                                        <div className="oh-action-row" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button 
                                                className="oh-btn-view-ticket" 
                                                // Lưu ý: Đảm bảo API getMyInvoices trả về biến orderCode hoặc transactionCode nhé
                                                onClick={() => navigate(`/ticket?orderCode=${inv.orderCode}`)}
                                            >
                                                🎟️ Xem Vé Điện Tử
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderHistory;
