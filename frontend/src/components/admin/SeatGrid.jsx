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

                    let posLabel = `${seat.rowLabel}${seat.columnNumber}`;
                    let currentDisplayPrice = rawPrice ? rawPrice * multiplier : null;
                    
                    if (seat.seatType === 'COUPLE' && seat.pairedSeatId) {
                        const pairedSeat = seats.find(s => s.id === seat.pairedSeatId);
                        if (pairedSeat) {
                            const p1 = seat.columnNumber;
                            const p2 = pairedSeat.columnNumber;
                            posLabel = p1 < p2 
                                ? `${seat.rowLabel}${p1}-${seat.rowLabel}${p2}`
                                : `${seat.rowLabel}${p2}-${seat.rowLabel}${p1}`;
                                
                            const pairedRaw = pairedSeat.basePrice ?? pairedSeat.price ?? pairedSeat.finalPrice ?? 0;
                            if (currentDisplayPrice !== null) {
                                currentDisplayPrice += (pairedRaw * multiplier);
                            }
                        }
                    }

                    const priceDisplay = currentDisplayPrice ? formatPrice(currentDisplayPrice) : 'Chưa set giá';
                    const extra = getExtraClass ? getExtraClass(seat) : '';
                    const seatStatus = seat.effectiveStatus || seat.status || 'AVAILABLE';
                    const priceLabel = multiplier !== 1 ? 'Giá ' : 'Giá';
                    const title = (getTitle && getTitle(seat))
                        || `Vị trí: ${posLabel}\nLoại: ${seat.seatType}\n${priceLabel}: ${priceDisplay}\nTrạng thái: ${seatStatus}`;

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
