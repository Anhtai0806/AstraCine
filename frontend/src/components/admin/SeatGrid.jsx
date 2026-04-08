import React, { useState } from 'react';
import './SeatGrid.css';

const SEAT_TYPES = {
    NORMAL: { label: 'Thường', class: 'type-NORMAL' },
    VIP: { label: 'VIP', class: 'type-VIP' },
    COUPLE: { label: 'Đôi', class: 'type-COUPLE' },
    PREMIUM: { label: 'Premium', class: 'type-PREMIUM' }
};

const SeatGrid = ({ seats, totalColumns, onSeatClick, getExtraClass, getTitle, priceMultiplier }) => {
    const [hoveredSeat, setHoveredSeat] = useState(null);

    if (!seats || seats.length === 0) {
        return <div style={{ padding: 20, color: '#888' }}>Không có dữ liệu ghế</div>;
    }

    const formatPrice = (price) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

    return (
        <div className="visual-editor-wrapper">
            <div className="legend-bar">
                {Object.keys(SEAT_TYPES).map((key) => (
                    <div key={key} className="legend-item">
                        <span className={`dot ${SEAT_TYPES[key].class}`}></span>
                        {SEAT_TYPES[key].label}
                    </div>
                ))}
            </div>

            <div className="screen-wrapper">
                <div className="screen-curve"></div>
                <div className="screen-text">MÀN HÌNH</div>
            </div>

            <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${totalColumns}, 40px)` }}>
                {seats.map((seat) => {
                    const config = SEAT_TYPES[seat.seatType] || SEAT_TYPES.NORMAL;
                    const rawPrice = seat.basePrice ?? seat.price ?? seat.finalPrice ?? null;
                    const multiplier = priceMultiplier || 1;
                    const displayPrice = rawPrice ? rawPrice * multiplier : null;
                    const priceDisplay = displayPrice ? formatPrice(displayPrice) : 'Chưa set giá';
                    const extra = getExtraClass ? getExtraClass(seat) : '';
                    const seatStatus = seat.effectiveStatus || seat.status || 'AVAILABLE';
                    const priceLabel = multiplier !== 1 ? 'Giá ' : 'Giá';
                    const title = (getTitle && getTitle(seat))
                        || `Vị trí: ${seat.rowLabel}${seat.columnNumber}\nLoại: ${seat.seatType}\n${priceLabel}: ${priceDisplay}\nTrạng thái: ${seatStatus}`;

                    const isPairHovered = hoveredSeat && (
                        seat.id === hoveredSeat.id ||
                        (seat.pairedSeatId && seat.pairedSeatId === hoveredSeat.id) ||
                        (hoveredSeat.pairedSeatId && hoveredSeat.pairedSeatId === seat.id)
                    );
                    const pairHoverClass = isPairHovered ? 'seat-pair-hover' : '';

                    return (
                        <div
                            key={seat.id}
                            className={`seat-item ${config.class} ${extra} ${pairHoverClass}`}
                            data-status={seatStatus}
                            onClick={() => onSeatClick && onSeatClick(seat)}
                            onMouseEnter={() => setHoveredSeat(seat)}
                            onMouseLeave={() => setHoveredSeat(null)}
                            title={title}
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
