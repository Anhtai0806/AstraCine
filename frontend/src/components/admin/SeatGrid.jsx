

import React from 'react';
import './SeatGrid.css'; // 👈 Import CSS riêng của ghế
// Cấu hình màu sắc
const SEAT_TYPES = {
    NORMAL:  { label: 'Thường', class: 'type-NORMAL' },
    VIP:     { label: 'VIP',    class: 'type-VIP' },
    COUPLE:  { label: 'Đôi',    class: 'type-COUPLE' },
    PREMIUM: { label: 'Premium',class: 'type-PREMIUM' }
};

const SeatGrid = ({ seats, totalColumns, onSeatClick }) => {
    if (!seats || seats.length === 0) return null;

    // Hàm format tiền tệ (VD: 50000 -> 50.000đ)
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    return (
        <div className="visual-editor-wrapper">
            {/* Legend Bar */}
            <div className="legend-bar">
                {Object.keys(SEAT_TYPES).map(key => (
                    <div key={key} className="legend-item">
                        <span className={`dot ${SEAT_TYPES[key].class}`}></span>
                        {SEAT_TYPES[key].label}
                    </div>
                ))}
            </div>

            <div className="screen-curve">MÀN HÌNH</div>

            {/* Seat Grid */}
            <div className="seat-grid" style={{
                gridTemplateColumns: `repeat(${totalColumns}, 36px)`
            }}>
                {seats.map(seat => {
                    const config = SEAT_TYPES[seat.seatType] || SEAT_TYPES.NORMAL;
                    
                    // ✅ HIỂN THỊ GIÁ TIỀN TRONG TOOLTIP
                    // Lấy giá từ object ghế (backend gửi về) hoặc lấy mặc định nếu chưa có
                    const priceDisplay = seat.basePrice ? formatPrice(seat.basePrice) : 'Chưa set giá';

                    return (
                        <div 
                            key={seat.id}
                            className={`seat-item ${config.class}`}
                            onClick={() => onSeatClick(seat)}
                            // 👇 Tooltip hiển thị đầy đủ thông tin khi rê chuột vào
                            title={`Vị trí: ${seat.rowLabel}${seat.columnNumber}\nLoại: ${seat.seatType}\nGiá gốc: ${priceDisplay}`}
                        >
                            {seat.rowLabel}{seat.columnNumber}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SeatGrid;