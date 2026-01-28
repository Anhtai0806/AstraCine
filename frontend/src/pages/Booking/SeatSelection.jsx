import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { seatHoldApi } from "../../services/seatHoldApi";
import { connectSeatSocket } from "/src/services/seatHoldSocket.js";
import PaymentQrModal from "./PaymentQrModal.jsx";
import "./SeatSelection.css";

function nowMs() {
    return Date.now();
}

export default function SeatSelection() {
    const { showtimeId } = useParams();
    const sid = useMemo(() => Number(showtimeId), [showtimeId]);

    const [seats, setSeats] = useState([]); // SeatStateDto[]
    const [hold, setHold] = useState(null); // {holdId, expiresAt, ttlSeconds, seatIds}
    const [selectedSeatIds, setSelectedSeatIds] = useState([]);
    const [error, setError] = useState(null);

    const [payment, setPayment] = useState(null); // {paymentSessionId, amount, qrPayload, expiresAt, status}
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentBusy, setPaymentBusy] = useState(false);

    // store cleanup functions/timers
    const disconnectRef = useRef(null);
    const renewTimerRef = useRef(null);

    async function load() {
        const data = await seatHoldApi.getSeats(sid);
        setSeats(data || []);
    }

    useEffect(() => {
        if (!sid || Number.isNaN(sid)) return;

        setError(null);

        // 1) load snapshot
        load().catch((e) => {
            console.error("load seats failed", e);
            setError(e);
        });

        // 2) connect WS + subscribe
        disconnectRef.current = connectSeatSocket(sid, (evt) => {
            setSeats((prev) => applySeatEvent(prev, evt));
        });

        return () => {
            // cleanup socket
            try {
                disconnectRef.current?.();
            } catch (_) {}
            disconnectRef.current = null;

            // cleanup renew timer
            if (renewTimerRef.current) clearInterval(renewTimerRef.current);
            renewTimerRef.current = null;
        };
    }, [sid]);

    // renew every 30s while hold active
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

    async function toggleSeat(seatId) {
        setError(null);

        const seat = seats.find((s) => s.seatId === seatId);
        if (!seat) return;

        // chỉ cho chọn AVAILABLE
        if (seat.status !== "AVAILABLE") return;

        const next = selectedSeatIds.includes(seatId)
            ? selectedSeatIds.filter((id) => id !== seatId)
            : [...selectedSeatIds, seatId];

        try {
            // MVP: đổi selection => release hold cũ rồi hold lại all-or-nothing
            if (hold?.holdId) {
                await seatHoldApi.releaseHold(hold.holdId);
            }

            if (next.length === 0) {
                setHold(null);
                setSelectedSeatIds([]);
                await load();
                return;
            }

            const clientRequestId =
                (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());

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
            // Step 1: create mock payment session and open QR popup
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
            // Step 2: mock confirm payment
            await seatHoldApi.confirmMockPayment(payment.paymentSessionId);
            // Step 3: now allow SOLD
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
            <h2>Seat Selection (showtimeId: {sid})</h2>

            <div className="seat-toolbar">
                <div>
                    <span className="badge available" /> Available
                    <span className="badge held" /> Held
                    <span className="badge sold" /> Sold
                    <span className="badge selected" /> Selected
                </div>

                <div className="actions">
                    {hold?.holdId ? (
                        <>
                            <div className="hold-info">
                                Hold: <code>{hold.holdId.slice(0, 8)}...</code> — remaining:{" "}
                                {remainingSeconds}s
                            </div>
                            <button className="btn" onClick={release}>
                                Release
                            </button>
                            <button className="btn primary" onClick={confirm}>
                                Confirm (SOLD)
                            </button>
                        </>
                    ) : (
                        <div className="hold-info">Select seats to hold</div>
                    )}
                </div>
            </div>

            {error ? (
                <pre className="error">{JSON.stringify(error, null, 2)}</pre>
            ) : null}

            <div className="seat-grid">
                {seats.map((s) => {
                    const code = `${s.rowLabel}${s.columnNumber}`;
                    const isSelected = selectedSeatIds.includes(s.seatId);
                    const cls = [
                        "seat",
                        s.status === "AVAILABLE" ? "available" : "",
                        s.status === "HELD" ? "held" : "",
                        s.status === "SOLD" ? "sold" : "",
                        isSelected ? "selected" : "",
                    ].join(" ");

                    return (
                        <button
                            key={s.seatId}
                            className={cls}
                            onClick={() => toggleSeat(s.seatId)}
                            disabled={s.status !== "AVAILABLE"}
                            title={s.status}
                        >
                            {code}
                        </button>
                    );
                })}
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
            // release chỉ về AVAILABLE nếu chưa SOLD
            if (s.status === "SOLD") return s;
            return { ...s, status: "AVAILABLE", heldExpiresAt: null };
        }
        if (evt.type === "SEAT_SOLD") {
            return { ...s, status: "SOLD", heldExpiresAt: null };
        }

        return s;
    });
}
