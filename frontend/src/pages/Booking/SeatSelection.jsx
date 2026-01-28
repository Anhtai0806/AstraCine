import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { seatHoldApi } from "../../api/seatHoldApi.js";
import { connectSeatSocket } from "/src/services/seatHoldSocket.js";
import PaymentQrModal from "./PaymentQrModal.jsx";

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

export default function SeatSelection() {
    const { showtimeId } = useParams();
    const sid = useMemo(() => Number(showtimeId), [showtimeId]);

    const [seats, setSeats] = useState([]); // SeatStateDto[]
    const [hold, setHold] = useState(null);
    const [selectedSeatIds, setSelectedSeatIds] = useState([]);
    const [error, setError] = useState(null);

    const [payment, setPayment] = useState(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentBusy, setPaymentBusy] = useState(false);

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
            } catch (_) {}
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

    const remainingSeconds = useMemo(() => {
        if (!hold?.expiresAt) return null;
        return Math.max(0, Math.floor((hold.expiresAt - nowMs()) / 1000));
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

    const selectedTotal = useMemo(() => {
        if (!selectedSeatIds?.length) return 0;
        return selectedSeatIds.reduce((sum, id) => {
            const seat = seatById.get(id);
            const price = seat?.finalPrice;
            const num = typeof price === "string" ? Number(price) : (price ?? 0);
            return sum + (Number.isNaN(num) ? 0 : num);
        }, 0);
    }, [selectedSeatIds, seatById]);

    const selectedSeatDetails = useMemo(() => {
        return (selectedSeatIds || [])
            .map((id) => seatById.get(id))
            .filter(Boolean)
            .map((s) => ({
                seatId: s.seatId,
                code: `${s.rowLabel}${s.columnNumber}`,
                seatType: s.seatType,
                finalPrice: s.finalPrice,
            }));
    }, [selectedSeatIds, seatById]);

    // ✅ ADAPTER: map SeatStateDto -> shape SeatGrid Admin expects
    // SeatGrid Admin đang dùng: seat.id, seat.rowLabel, seat.columnNumber, seat.seatType, seat.basePrice
    // Mình dùng basePrice = finalPrice để tooltip hiển thị đúng
    const seatsForGrid = useMemo(() => {
        return (sortedSeats || []).map((s) => {
            const isSelected = selectedSeatIds.includes(s.seatId);

            // ✅ quan trọng: selected ưu tiên hơn HELD để không bị "vàng như người khác"
            const effectiveStatus = isSelected ? "SELECTED" : s.status;

            return {
                ...s,

                // SeatGrid Admin key uses `id`
                id: s.seatId,

                // tooltip price field SeatGrid uses basePrice
                basePrice: s.finalPrice,

                // để SeatSelection.css override style theo trạng thái
                effectiveStatus,
            };
        });
    }, [sortedSeats, selectedSeatIds]);

    async function toggleSeat(seatId) {
        setError(null);

        const seat = seatById.get(seatId);
        if (!seat) return;

        const isMine = selectedSeatIds.includes(seatId);

        // ✅ chỉ chặn nếu HELD/SOLD mà KHÔNG phải ghế mình
        if (seat.status !== "AVAILABLE" && !isMine) return;

        const next = isMine ? selectedSeatIds.filter((id) => id !== seatId) : [...selectedSeatIds, seatId];

        try {
            // MVP: thay selection => release hold cũ rồi hold lại
            if (hold?.holdId) {
                await seatHoldApi.releaseHold(hold.holdId);
            }

            if (next.length === 0) {
                setHold(null);
                setSelectedSeatIds([]);
                await load();
                return;
            }

            const clientRequestId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
            const resp = await seatHoldApi.holdSeats(sid, next, clientRequestId);

            setHold(resp);
            setSelectedSeatIds(next);
        } catch (e) {
            console.error("toggleSeat hold failed", e);
            setError(e);
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

    async function confirm() {
        setError(null);
        if (!hold?.holdId) return;
        try {
            const p = await seatHoldApi.createMockPayment(hold.holdId);
            setPayment(p);
            setPaymentOpen(true);
        } catch (e) {
            console.error("confirm failed", e);
            setError(e);
        }
    }

    async function confirmPaid() {
        if (!payment?.paymentSessionId || !hold?.holdId) return;
        setError(null);
        setPaymentBusy(true);
        try {
            await seatHoldApi.confirmMockPayment(payment.paymentSessionId);
            await seatHoldApi.confirmHold(hold.holdId, payment.paymentSessionId);

            setPaymentOpen(false);
            setPayment(null);
            setHold(null);
            setSelectedSeatIds([]);
            await load();
        } catch (e) {
            console.error("payment confirm failed", e);
            setError(e);
        } finally {
            setPaymentBusy(false);
        }
    }

    return (
        <div className="seat-page">
            <h2>Chọn ghế (showtimeId: {sid})</h2>

            <div className="seat-toolbar">
                <div className="hold-info">
                    {hold?.holdId ? (
                        <>
                            Đang giữ: <code>{hold.holdId.slice(0, 8)}...</code> · Còn lại: {remainingSeconds}s
                        </>
                    ) : (
                        <>Chọn ghế để giữ</>
                    )}
                    <span className="total"> · Tổng: {formatCurrencyVND(selectedTotal)}</span>
                </div>

                <div className="actions">
                    {hold?.holdId ? (
                        <>
                            <button className="btn" onClick={release}>
                                Hủy giữ
                            </button>
                            <button className="btn primary" onClick={confirm}>
                                Xác nhận (SOLD)
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {error ? <pre className="error">{JSON.stringify(error, null, 2)}</pre> : null}

            <div className="seat-content">
                <div className="seat-map booking-seat-map">
                    {/* SeatGrid Admin giữ nguyên UI, mình chỉ truyền seats + totalColumns */}
                    <SeatGrid
                        seats={seatsForGrid}
                        totalColumns={totalColumns}
                        onSeatClick={(seat) => toggleSeat(seat.id)} // seat.id = seatId
                    />
                </div>

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
                                        <td>{s.code}</td>
                                        <td>{s.seatType}</td>
                                        <td style={{ textAlign: "right" }}>{formatCurrencyVND(s.finalPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div className="summary-total">
                        Tổng: <strong>{formatCurrencyVND(selectedTotal)}</strong>
                    </div>
                </div>
            </div>

            <PaymentQrModal
                open={paymentOpen}
                payment={payment}
                remainingSeconds={remainingSeconds}
                busy={paymentBusy}
                onClose={() => {
                    if (paymentBusy) return;
                    setPaymentOpen(false);
                }}
                onConfirmPaid={confirmPaid}
            />
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
