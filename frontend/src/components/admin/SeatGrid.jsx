    import React from 'react';
    import './SeatGrid.css';

    // Cấu hình loại ghế
    const SEAT_TYPES = {
        NORMAL:  { label: 'Thường',  class: 'type-NORMAL' },
        VIP:     { label: 'VIP',     class: 'type-VIP' },
        COUPLE:  { label: 'Đôi',     class: 'type-COUPLE' },
        PREMIUM: { label: 'Premium', class: 'type-PREMIUM' }
    };

    const SeatGrid = ({ seats, totalColumns, onSeatClick, getExtraClass, getTitle }) => {
        if (!seats || seats.length === 0) return <div style={{padding:20, color:'#888'}}>Không có dữ liệu ghế</div>;

        const formatPrice = (price) =>
            new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

        return (
            <div className="visual-editor-wrapper">

                {/* 1. THANH CHÚ THÍCH (LEGEND) */}
                <div className="legend-bar">
                    {Object.keys(SEAT_TYPES).map((key) => (
                        <div key={key} className="legend-item">
                            <span className={`dot ${SEAT_TYPES[key].class}`}></span>
                            {SEAT_TYPES[key].label}
                        </div>
                    ))}
                </div>

                {/* 2. MÀN HÌNH (SCREEN) */}
                <div className="screen-wrapper">
                    <div className="screen-curve"></div>
                    <div className="screen-text">MÀN HÌNH</div>
                </div>

                {/* 3. LƯỚI GHẾ */}
                <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${totalColumns}, 40px)` }}>
                    {seats.map((seat) => {
                        const config = SEAT_TYPES[seat.seatType] || SEAT_TYPES.NORMAL;
                        const rawPrice = seat.basePrice ?? seat.price ?? seat.finalPrice ?? null;
                        const priceDisplay = rawPrice ? formatPrice(rawPrice) : "Chưa set giá";


                        const extra = getExtraClass ? getExtraClass(seat) : "";
                        const title = (getTitle && getTitle(seat)) ||
                            `Vị trí: ${seat.rowLabel}${seat.columnNumber}\nLoại: ${seat.seatType}\nGiá: ${priceDisplay}`;

                        return (
                            <div
                                key={seat.id}
                                className={`seat-item ${config.class} ${extra}`}
                                data-status={seat.effectiveStatus || seat.status}
                                onClick={() => onSeatClick && onSeatClick(seat)}
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