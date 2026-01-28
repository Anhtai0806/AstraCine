

import React from 'react';
import './SeatGrid.css'; // 👈 Import CSS riêng của ghế
// Cấu hình màu sắc
const SEAT_TYPES = {
    NORMAL:  { label: 'Thường', class: 'type-NORMAL' },
    VIP:     { label: 'VIP',    class: 'type-VIP' },
    COUPLE:  { label: 'Đôi',    class: 'type-COUPLE' },
    PREMIUM: { label: 'Premium',class: 'type-PREMIUM' }
};

const SeatGrid = ({ seats, totalColumns, onSeatClick, getExtraClass, getTitle }) => {
    if (!seats || seats.length === 0) return null;

    const formatPrice = (price) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

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

            <div className="screen-curve">MÀN HÌNH</div>

            <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${totalColumns}, 36px)` }}>
                {seats.map((seat) => {
                    const config = SEAT_TYPES[seat.seatType] || SEAT_TYPES.NORMAL;
                    const priceDisplay = seat.basePrice ? formatPrice(seat.basePrice) : "Chưa set giá";

                    const extra = getExtraClass ? getExtraClass(seat) : "";
                    const title =
                        (getTitle && getTitle(seat)) ||
                        `Vị trí: ${seat.rowLabel}${seat.columnNumber}\nLoại: ${seat.seatType}\nGiá: ${priceDisplay}\nTrạng thái: ${
                            seat.effectiveStatus || seat.status || "AVAILABLE"
                        }`;

                    return (
                        <div
                            key={seat.id}
                            className={`seat-item ${config.class} ${extra}`}
                            data-status={seat.effectiveStatus || seat.status || "AVAILABLE"}
                            onClick={() => onSeatClick(seat)}
                            title={title}
                        >
                            {seat.rowLabel}
                            {seat.columnNumber}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SeatGrid;