import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { seatHoldApi } from "../../api/seatHoldApi.js";
import { connectSeatSocket } from "/src/services/seatHoldSocket.js";
import { useAuth } from "../../contexts/AuthContext.jsx";

import SeatGrid from "../../components/admin/SeatGrid.jsx";
import "../../components/admin/SeatGrid.css";

import "./SeatSelection.css";

function nowMs() {
    return Date.now();
}

function formatCurrencyVND(value) {
    if (value == null) return "";
    const num = typeof value === "string" ? Number(value) : value;
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

/**
 * ✅ Booking price source (tạm thời): theo seatType giống Admin.
 * Sau này thêm TimeSlot multiplier thì chỉ cần sửa hàm getSeatTypePrice()
 * hoặc thay bằng getFinalPrice(seatType, multiplier)
 */
function getSeatDisplayPrice(seat) {
    const finalPrice = Number(seat?.finalPrice);
    if (Number.isFinite(finalPrice) && finalPrice > 0) return finalPrice;

    const basePrice = Number(seat?.basePrice);
    if (Number.isFinite(basePrice) && basePrice > 0) return basePrice;

    return 0;
}

export default function SeatSelection() {
    const { showtimeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const sid = useMemo(() => Number(showtimeId), [showtimeId]);

    // Thông tin phim/suất chiếu được truyền từ ShowtimeBrowser
    const { movieTitle, startTime, endTime, roomName, restoredHoldId, restoredSeatIds } = location.state || {};
    const isStaffMode = location.pathname.startsWith("/staff");

    const [seats, setSeats] = useState([]); // SeatStateDto[]
    // Khôi phục hold & ghế đã chọn nếu quay lại từ ComboMenu
    const [hold, setHold] = useState(() =>
        restoredHoldId ? { holdId: restoredHoldId, expiresAt: null } : null
    );
    const [selectedSeatIds, setSelectedSeatIds] = useState(() => restoredSeatIds || []);
    const [error, setError] = useState(null);

    const disconnectRef = useRef(null);
    const renewTimerRef = useRef(null);

    async function load() {
        const data = await seatHoldApi.getSeats(sid);
        setSeats(data || []);
    }

    useEffect(() => {
        if (!sid || Number.isNaN(sid)) return;

        setError(null);

        load().catch((e) => {
            console.error("load seats failed", e);
            setError(e);
        });

        disconnectRef.current = connectSeatSocket(sid, (evt) => {
            setSeats((prev) => applySeatEvent(prev, evt));
        });

        return () => {
            try {
                disconnectRef.current?.();
            } catch (_) { }
            disconnectRef.current = null;

            if (renewTimerRef.current) clearInterval(renewTimerRef.current);
            renewTimerRef.current = null;
        };
    }, [sid]);

    useEffect(() => {
        if (renewTimerRef.current) clearInterval(renewTimerRef.current);
        renewTimerRef.current = null;

        if (!hold?.holdId) return;

        renewTimerRef.current = setInterval(async () => {
            try {
                const renewed = await seatHoldApi.renewHold(hold.holdId);
                setHold(renewed);
            } catch (e) {
                console.warn("renew failed", e);
            }
        }, 30000);

        return () => {
            if (renewTimerRef.current) clearInterval(renewTimerRef.current);
            renewTimerRef.current = null;
        };
    }, [hold?.holdId]);

    const [remainingSeconds, setRemainingSeconds] = useState(null);

    useEffect(() => {
        if (!hold?.expiresAt) {
            setRemainingSeconds(null);
            return;
        }

        // Tính ngay lập tức
        const calc = () => Math.max(0, Math.floor((hold.expiresAt - Date.now()) / 1000));
        setRemainingSeconds(calc());

        // Cập nhật mỗi 1 giây
        const timer = setInterval(() => {
            const secs = calc();
            setRemainingSeconds(secs);
            if (secs <= 0) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [hold?.expiresAt]);

    // sort seats
    const sortedSeats = useMemo(() => {
        const copy = [...(seats || [])];
        copy.sort((a, b) => {
            const rowCompare = String(a.rowLabel || "").localeCompare(String(b.rowLabel || ""));
            if (rowCompare !== 0) return rowCompare;
            return (a.columnNumber || 0) - (b.columnNumber || 0);
        });
        return copy;
    }, [seats]);

    const totalColumns = useMemo(() => {
        if (!sortedSeats.length) return 10;
        const maxCol = Math.max(...sortedSeats.map((s) => Number(s.columnNumber) || 0));
        return maxCol > 0 ? maxCol : 10;
    }, [sortedSeats]);

    const seatById = useMemo(() => new Map(sortedSeats.map((s) => [s.seatId, s])), [sortedSeats]);

    /**
     * ✅ Tổng tiền theo seatType (đồng bộ Admin)
     */
    const selectedTotal = useMemo(() => {
        if (!selectedSeatIds?.length) return 0;
        return selectedSeatIds.reduce((sum, id) => {
            const seat = seatById.get(id);
            if (!seat) return sum;
            return sum + getSeatDisplayPrice(seat);
        }, 0);
    }, [selectedSeatIds, seatById]);

    /**
     * ✅ Summary theo seatType (đồng bộ Admin)
     */
    const selectedSeatDetails = useMemo(() => {
        return (selectedSeatIds || [])
            .map((id) => seatById.get(id))
            .filter(Boolean)
            .map((s) => ({
                seatId: s.seatId,
                code: `${s.rowLabel}${s.columnNumber}`,
                seatType: s.seatType,
                finalPrice: getSeatDisplayPrice(s),
            }));
    }, [selectedSeatIds, seatById]);

    /**
     * ✅ Adapter cho SeatGrid Admin:
     * - SeatGrid dùng seat.basePrice để hiển thị tooltip giá
     * - Booking muốn giá giống Admin => basePrice = giá theo seatType
     */
    const seatsForGrid = useMemo(() => {
        return (sortedSeats || []).map((s) => {
            const isSelected = selectedSeatIds.includes(s.seatId);
            const effectiveStatus = isSelected ? "SELECTED" : s.status;
            const displayPrice = getSeatDisplayPrice(s);

            return {
                ...s,
                id: s.seatId,
                basePrice: displayPrice,
                finalPrice: displayPrice,
                effectiveStatus,
            };
        });
    }, [sortedSeats, selectedSeatIds]);

    async function toggleSeat(seatId) {
        // Kiểm tra đăng nhập trước khi cho phép chọn ghế
        if (!user) {
            navigate("/login", {
                state: { returnUrl: isStaffMode ? `/staff/showtimes/${showtimeId}` : `/booking/showtimes/${showtimeId}` },
            });
            return;
        }

        setError(null);

        const seat = seatById.get(seatId);
        if (!seat) return;

        const isMine = selectedSeatIds.includes(seatId);

        // chỉ chặn nếu HELD/SOLD mà không phải ghế mình
        if (seat.status !== "AVAILABLE" && !isMine) return;

        const next = isMine
            ? selectedSeatIds.filter((id) => id !== seatId)
            : [...selectedSeatIds, seatId];

        try {
            // ✅ set trước để tránh nhấp nháy status khi WS event đến nhanh
            setSelectedSeatIds(next);

            // MVP: đổi selection => release hold cũ rồi hold lại
            if (hold?.holdId) {
                await seatHoldApi.releaseHold(hold.holdId);
            }

            if (next.length === 0) {
                setHold(null);
                await load();
                return;
            }

            const clientRequestId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
            const resp = await seatHoldApi.holdSeats(sid, next, clientRequestId);

            setHold(resp);
        } catch (e) {
            console.error("toggleSeat hold failed", e);
            setError(e);
            // rollback bằng snapshot mới
            await load();
        }
    }

    async function release() {
        setError(null);
        if (!hold?.holdId) return;
        try {
            await seatHoldApi.releaseHold(hold.holdId);
            setHold(null);
            setSelectedSeatIds([]);
            await load();
        } catch (e) {
            console.error("release failed", e);
            setError(e);
        }
    }

    function goToCombo() {
        if (!hold?.holdId || selectedSeatIds.length === 0) return;
        navigate(isStaffMode ? `/staff/showtimes/${sid}/combo` : `/booking/showtimes/${sid}/combo`, {
            state: {
                holdId: hold.holdId,
                showtimeId: sid,
                seatDetails: selectedSeatDetails,
                seatTotal: selectedTotal,
                // movie info forwarded for invoice page
                movieTitle,
                startTime,
                endTime,
                roomName: roomName || null,
            },
        });
    }

    return (
        <div className="seat-page">
            {/* Breadcrumb */}
            <div className="booking-steps">
                <span className="step active">1. Chọn ghế</span>
                <span className="step-arrow">›</span>
                <span className="step">2. Chọn bắp nước</span>
                <span className="step-arrow">›</span>
                <span className="step">3. Thanh toán</span>
            </div>

            <h2 className="page-title">Chọn ghế</h2>

            {/* Movie info banner */}
            {movieTitle && (
                <div className="movie-info-banner">
                    <span className="movie-info-icon">🎬</span>
                    <div className="movie-info-text">
                        <span className="movie-info-title">{movieTitle}</span>
                        {startTime && (
                            <span className="movie-info-time">
                                ⏰ {new Date(startTime).toLocaleString("vi-VN", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                {endTime && (
                                    <> → {new Date(endTime).toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}</>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Login notice for unauthenticated users */}
            {!user && (
                <div className="login-notice">
                    <span className="notice-icon">🔐</span>
                    <span>Vui lòng <button
                        className="login-link"
                        onClick={() => navigate("/login", { state: { returnUrl: isStaffMode ? `/staff/showtimes/${showtimeId}` : `/booking/showtimes/${showtimeId}` } })}
                    >
                        đăng nhập
                    </button> để chọn ghế và đặt vé.</span>
                </div>
            )}

            {/* Hold timer bar */}
            {hold?.holdId && (
                <div className="hold-timer-bar">
                    <span className="hold-timer-icon">⏱</span>
                    <span>Đang giữ ghế · Còn lại: <strong>{remainingSeconds}s</strong></span>
                    <code className="hold-id">{hold.holdId.slice(0, 8)}...</code>
                </div>
            )}

            {error ? <pre className="error">{JSON.stringify(error, null, 2)}</pre> : null}

            <div className="seat-content">
                {/* Seat map */}
                <div className="seat-map booking-seat-map">
                    <div className="screen-label">MÀN HÌNH</div>
                    <SeatGrid
                        seats={seatsForGrid}
                        totalColumns={totalColumns}
                        onSeatClick={(seat) => toggleSeat(seat.id)}
                    />
                    {/* Legend */}
                    <div className="seat-legend">

                        <span className="legend-item"><span className="legend-dot selected"></span>Đang chọn</span>
                        <span className="legend-item"><span className="legend-dot held"></span>Đang giữ</span>
                        <span className="legend-item"><span className="legend-dot sold"></span>Đã bán</span>
                    </div>
                </div>

                {/* Summary sidebar */}
                <div className="seat-summary">
                    <h3>Ghế đã chọn</h3>
                    {selectedSeatDetails.length === 0 ? (
                        <div className="muted">Chưa chọn ghế nào.</div>
                    ) : (
                        <table className="summary-table">
                            <thead>
                                <tr>
                                    <th>Ghế</th>
                                    <th>Loại</th>
                                    <th style={{ textAlign: "right" }}>Giá</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSeatDetails
                                    .slice()
                                    .sort((a, b) => a.code.localeCompare(b.code))
                                    .map((s) => (
                                        <tr key={s.seatId}>
                                            <td><span className="seat-code">{s.code}</span></td>
                                            <td><span className="seat-type-badge">{s.seatType}</span></td>
                                            <td style={{ textAlign: "right" }} className="price-cell">{formatCurrencyVND(s.finalPrice)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}

                    <div className="summary-total">
                        <span>Tạm tính</span>
                        <strong>{formatCurrencyVND(selectedTotal)}</strong>
                    </div>

                    <div className="summary-actions">
                        {hold?.holdId && (
                            <button className="btn-cancel" onClick={release}>Hủy ghế</button>
                        )}
                        <button
                            className="btn-continue"
                            disabled={!hold?.holdId || selectedSeatIds.length === 0}
                            onClick={goToCombo}
                        >
                            Tiếp tục →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function applySeatEvent(prevSeats, evt) {
    if (!evt?.type) return prevSeats;

    const seatIdSet = new Set(evt.seatIds || []);
    return prevSeats.map((s) => {
        if (!seatIdSet.has(s.seatId)) return s;

        if (evt.type === "SEAT_HELD") {
            return { ...s, status: "HELD", heldExpiresAt: evt.expiresAt };
        }
        if (evt.type === "SEAT_RELEASED") {
            if (s.status === "SOLD") return s;
            return { ...s, status: "AVAILABLE", heldExpiresAt: null };
        }
        if (evt.type === "SEAT_SOLD") {
            return { ...s, status: "SOLD", heldExpiresAt: null };
        }
        return s;
    });
}
