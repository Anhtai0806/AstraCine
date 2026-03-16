import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { getETicket } from '../../api/ticketApi';
import './TicketResult.css';

const TicketResult = () => {
    const location = useLocation();
    const [params] = useSearchParams();

    const [ticketData, setTicketData] = useState(location.state?.ticketData || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const orderCode = params.get('orderCode');

    // Nếu không có ticketData từ state (user F5) → fetch từ API
    useEffect(() => {
        if (ticketData) return; // Đã có data từ navigate state
        if (!orderCode) {
            setError('Không tìm thấy mã đơn hàng.');
            return;
        }

        setLoading(true);
        getETicket(orderCode)
            .then(data => {
                setTicketData(data);
            })
            .catch(err => {
                console.error('[Ticket] Fetch failed:', err);
                setError('Không thể tải thông tin vé. Vui lòng thử lại.');
            })
            .finally(() => setLoading(false));
    }, [orderCode, ticketData]);

    // --- Format helpers ---
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (minutes) => {
        if (!minutes) return '';
        return `${minutes} Phút`;
    };

    // --- Loading state ---
    if (loading) {
        return (
            <div className="ticket-result-page">
                <div className="success-message">
                    <h2>⏳ Đang tải vé...</h2>
                    <p>Vui lòng chờ trong giây lát.</p>
                </div>
            </div>
        );
    }

    // --- Error state ---
    if (error) {
        return (
            <div className="ticket-result-page">
                <div className="success-message">
                    <h2 style={{ color: '#ef4444' }}>❌ Lỗi</h2>
                    <p>{error}</p>
                    <button className="btn-download" onClick={() => window.location.href = '/'}>
                        Về trang chủ
                    </button>
                </div>
            </div>
        );
    }

    // --- No data ---
    if (!ticketData) {
        return (
            <div className="ticket-result-page">
                <div className="success-message">
                    <h2>🎬 Chưa có thông tin vé</h2>
                    <p>Vui lòng thanh toán để nhận vé điện tử.</p>
                </div>
            </div>
        );
    }

    // Tạo QR code URL từ ticketCode
    const qrUrl = ticketData.qrCode
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketData.qrCode)}`
        : null;

    return (
        <div className="ticket-result-page">
            
            <div className="success-message">
                <h2>🎉 Thanh Toán Thành Công!</h2>
                <p>Cảm ơn bạn đã đặt vé. Dưới đây là vé điện tử của bạn.</p>
            </div>

            {/* --- E-TICKET COMPONENT --- */}
            <div className="e-ticket">
                
                {/* 1. Phần Nền Đậm (Phim & Lịch) */}
                <div className="ticket-header">
                    <h1 className="ticket-movie-title">{ticketData.movieTitle || 'PHIM'}</h1>
                    <div className="movie-tags">
                        {ticketData.ageRating && (
                            <span className="tag age-rating">{ticketData.ageRating}</span>
                        )}
                        {ticketData.durationMinutes && (
                            <span className="tag">{formatDuration(ticketData.durationMinutes)}</span>
                        )}
                        <span className="tag">2D Phụ đề</span>
                    </div>

                    <div className="ticket-info-grid">
                        <div className="info-box">
                            <span>Ngày chiếu</span>
                            <strong>{formatDate(ticketData.showDate)}</strong>
                        </div>
                        <div className="info-box">
                            <span>Giờ chiếu</span>
                            <strong>{formatTime(ticketData.startTime)}</strong>
                        </div>
                        <div className="info-box">
                            <span>Phòng chiếu</span>
                            <strong>{ticketData.roomName || '-'}</strong>
                        </div>
                        <div className="info-box">
                            <span>Loại ghế</span>
                            <strong>{ticketData.seatType || '-'}</strong>
                        </div>
                    </div>
                </div>

                {/* 2. Phần Trung Tâm (Ghế) */}
                <div className="ticket-body">
                    <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Ghế của bạn
                    </span>
                    <div className="seats-highlight">
                        {ticketData.seats || '-'}
                    </div>
                </div>

                {/* 3. Đường Cắt Xé Vé (Hiệu ứng CSS) */}
                <div className="ticket-divider"></div>

                {/* 4. Phần Chân (QR Code) */}
                <div className="ticket-footer">
                    <div className="qr-container">
                        {qrUrl ? (
                            <img src={qrUrl} alt="QR Code" />
                        ) : (
                            <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                Không có QR
                            </div>
                        )}
                    </div>
                    <div className="ticket-code">{ticketData.ticketCode || ticketData.orderCode || '-'}</div>
                    <div className="scan-instruction">Vui lòng xuất trình mã QR này cho nhân viên soát vé</div>
                </div>
            </div>

            <div className="action-area">
                <button className="btn-download" onClick={() => window.print()}>
                    ⬇️ Lưu vé về máy
                </button>
                <button className="btn-download" style={{ background: '#cbd5e1', color: '#334155' }} onClick={() => window.location.href='/'}>
                    Về trang chủ
                </button>
            </div>

        </div>
    );
};

export default TicketResult;