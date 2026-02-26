import React from 'react';
import './TicketResult.css';

const TicketResult = () => {
    // MOCK DATA: Giả lập dữ liệu trả về từ API sau khi M4 xử lý thanh toán xong
    // Dữ liệu này được join từ các bảng: movies, rooms, showtimes, seats, tickets
    const ticketData = {
        movieTitle: "ĐÀO, PHỞ VÀ PIANO",
        ageRating: "T18",
        duration: "120 Phút",
        showDate: "15 Thg 4, 2026",
        startTime: "19:30",
        roomName: "Cinema 01 - IMAX",
        seats: "H5, H6",
        seatType: "VIP",
        ticketCode: "TKT-A8F92B",
        // Chèn chuỗi Base64 QR code bạn đã gen được từ Backend vào đây
        qrBase64: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-A8F92B" // Dùng link tạm để demo, thực tế là chuỗi base64 của bạn
    };

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
                    <h1 className="movie-title">{ticketData.movieTitle}</h1>
                    <div className="movie-tags">
                        <span className="tag age-rating">{ticketData.ageRating}</span>
                        <span className="tag">{ticketData.duration}</span>
                        <span className="tag">2D Phụ đề</span>
                    </div>

                    <div className="ticket-info-grid">
                        <div className="info-box">
                            <span>Ngày chiếu</span>
                            <strong>{ticketData.showDate}</strong>
                        </div>
                        <div className="info-box">
                            <span>Giờ chiếu</span>
                            <strong>{ticketData.startTime}</strong>
                        </div>
                        <div className="info-box">
                            <span>Phòng chiếu</span>
                            <strong>{ticketData.roomName}</strong>
                        </div>
                        <div className="info-box">
                            <span>Loại ghế</span>
                            <strong>{ticketData.seatType}</strong>
                        </div>
                    </div>
                </div>

                {/* 2. Phần Trung Tâm (Ghế) */}
                <div className="ticket-body">
                    <span style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>
                        Ghế của bạn
                    </span>
                    <div className="seats-highlight">
                        {ticketData.seats}
                    </div>
                </div>

                {/* 3. Đường Cắt Xé Vé (Hiệu ứng CSS) */}
                <div className="ticket-divider"></div>

                {/* 4. Phần Chân (QR Code) */}
                <div className="ticket-footer">
                    <div className="qr-container">
                        {/* Hiển thị ảnh QR từ chuỗi Base64 (hoặc URL demo) */}
                        <img src={ticketData.qrBase64} alt="QR Code" />
                    </div>
                    <div className="ticket-code">{ticketData.ticketCode}</div>
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