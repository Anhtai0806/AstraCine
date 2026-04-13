import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getAllPromotions, validatePromotion } from "../../api/promotionApi";
import { staffApi } from "../../api/staffApi";
import "./StaffCounterCheckout.css";
import { buildExpiredSeatRedirectState, buildSeatSelectionPath, getRemainingHoldSeconds } from "../../utils/holdSession";

const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);

const formatDateTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

function calcDiscountFromPromo(promo, baseTotal) {
    if (!promo) return 0;
    const value = parseFloat(promo.discountValue) || 0;
    const minOrder = parseFloat(promo.minOrderAmount) || 0;
    if (baseTotal < minOrder) return 0;
    if (promo.discountType === "PERCENTAGE") return Math.round((baseTotal * value) / 100);
    if (promo.discountType === "FIXED") return Math.min(value, baseTotal);
    return 0;
}

function isPromoValid(p) {
    if (p.status !== "ACTIVE") return false;
    const today = new Date().toISOString().slice(0, 10);
    if (p.startDate && p.startDate > today) return false;
    if (p.endDate && p.endDate < today) return false;
    if (p.maxUsage != null && p.currentUsage >= p.maxUsage) return false;
    return true;
}

function isPromoEligibleForOrder(promo, orderTotal) {
    const minOrder = parseFloat(promo?.minOrderAmount) || 0;
    return orderTotal >= minOrder;
}

export default function StaffCounterCheckout() {
    const { showtimeId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const {
        holdId,
        seatDetails = [],
        seatTotal = 0,
        cartItems = [],
        comboTotal = 0,
        grandTotal = 0,
        movieTitle,
        startTime,
        roomName,
        holdExpiresAt = null,
    } = location.state || {};

    const [promotions, setPromotions] = useState([]);
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [promoLoading, setPromoLoading] = useState(true);
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState(null);
    const [codeValidating, setCodeValidating] = useState(false);

    const [customer, setCustomer] = useState({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        paymentMethod: "CASH",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [result, setResult] = useState(null);

    const holdExpiredHandledRef = useRef(false);

    useEffect(() => {
        if (!holdId || !holdExpiresAt) {
            holdExpiredHandledRef.current = false;
            return;
        }

        const seatPath = buildSeatSelectionPath(true, showtimeId);
        const seatState = buildExpiredSeatRedirectState({ movieTitle, startTime, roomName });

        const handleExpired = () => {
            if (holdExpiredHandledRef.current) return;
            holdExpiredHandledRef.current = true;
            setSubmitError("Phiên giữ ghế đã hết hạn. Vui lòng chọn lại ghế.");
            alert("Đã hết thời gian giữ ghế. Hệ thống sẽ đưa bạn về màn hình chọn ghế.");
            navigate(seatPath, { replace: true, state: seatState });
        };

        const tick = () => {
            const secs = getRemainingHoldSeconds(holdExpiresAt);
            if ((secs ?? 0) <= 0) {
                handleExpired();
                return 0;
            }
            return secs;
        };

        tick();
        const timer = setInterval(() => {
            const secs = tick();
            if ((secs ?? 0) <= 0) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [holdId, holdExpiresAt, movieTitle, navigate, roomName, showtimeId, startTime]);

    useEffect(() => {
        if (!holdId || seatDetails.length === 0) {
            navigate("/staff/booking");
            return;
        }

        getAllPromotions()
            .then((data) => setPromotions((data || []).filter(isPromoValid)))
            .catch(() => setPromotions([]))
            .finally(() => setPromoLoading(false));
    }, [holdId, seatDetails.length, navigate]);

    const discountAmount = useMemo(
        () => calcDiscountFromPromo(selectedPromo, grandTotal),
        [selectedPromo, grandTotal]
    );
    const eligiblePromotions = useMemo(
        () => promotions.filter((promo) => isPromoEligibleForOrder(promo, grandTotal)),
        [promotions, grandTotal]
    );
    const finalTotal = Math.max(0, grandTotal - discountAmount);

    useEffect(() => {
        if (selectedPromo && !isPromoEligibleForOrder(selectedPromo, grandTotal)) {
            setSelectedPromo(null);
        }
    }, [selectedPromo, grandTotal]);

    const handleValidateCode = async () => {
        const code = codeInput.trim().toUpperCase();
        if (!code) return;
        setCodeError(null);
        setCodeValidating(true);
        try {
            const promo = await validatePromotion(code);
            if (!isPromoValid(promo)) throw new Error("Mã không còn hiệu lực.");
            const minOrder = parseFloat(promo.minOrderAmount) || 0;
            if (grandTotal < minOrder) {
                setCodeError(`Đơn tối thiểu ${formatCurrency(minOrder)} mới áp dụng được mã này.`);
                return;
            }
            setSelectedPromo(promo);
            setCodeInput("");
        } catch (err) {
            setCodeError(err?.message || "Mã không hợp lệ hoặc đã hết hạn.");
        } finally {
            setCodeValidating(false);
        }
    };

    const handleSubmit = async () => {
        if (!holdId) {
            setSubmitError("Phiên giữ ghế đã hết hạn. Vui lòng chọn lại ghế.");
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        try {
            const payload = {
                holdId,
                totalAmount: finalTotal,
                promotionCode: selectedPromo?.code || null,
                comboItems: cartItems.map((item) => ({
                    comboId: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                    name: item.name,
                })),
                customerName: customer.customerName || null,
                customerEmail: customer.customerEmail || null,
                customerPhone: customer.customerPhone || null,
                paymentMethod: customer.paymentMethod,
            };

            const response = await staffApi.createCounterBooking(payload);
            setResult(response);
        } catch (err) {
            setSubmitError(err?.message || err?.error || "Không thể tạo hóa đơn tại quầy.");
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="staff-checkout-page">
                <div className="staff-checkout-success">
                    <div className="success-badge">✅ Hoàn tất</div>
                    <h1>Đã tạo hóa đơn tại quầy thành công</h1>
                    <p>
                        Hóa đơn <strong>#{result.invoiceId}</strong> đã được ghi nhận với {result.tickets?.length || 0} vé.
                        Mã vé và ảnh QR đã được sinh sẵn để đội gửi mail / in vé nối tiếp.
                    </p>

                    <div className="success-meta-grid">
                        <div><span>Phim</span><strong>{result.movieTitle}</strong></div>
                        <div><span>Suất chiếu</span><strong>{formatDateTime(result.startTime)}</strong></div>
                        <div><span>Phòng</span><strong>{result.roomName || "—"}</strong></div>
                        <div><span>Thanh toán</span><strong>{result.paymentMethod}</strong></div>
                        <div><span>Khách</span><strong>{result.customerDisplay || "Khách lẻ"}</strong></div>
                        <div><span>Tổng tiền</span><strong>{formatCurrency(result.totalAmount)}</strong></div>
                    </div>

                    <div className="staff-ticket-grid">
                        {(result.tickets || []).map((ticket) => (
                            <div key={ticket.ticketId} className="staff-ticket-card">
                                <img src={ticket.qrImageBase64} alt={ticket.ticketCode} />
                                <div className="staff-ticket-card-body">
                                    <strong>{ticket.seatCode}</strong>
                                    <span>{ticket.seatType}</span>
                                    <code>{ticket.ticketCode}</code>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="staff-success-actions">
                        <button onClick={() => navigate("/staff/booking")}>Tạo đơn mới</button>
                        <button className="secondary" onClick={() => navigate("/staff/ticket-checkin")}>Mở màn hình soát vé</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="staff-checkout-page">
            <div className="staff-checkout-header">
                <div>
                    <div className="staff-kicker">Bán vé tại quầy</div>
                    <h1>Chốt hóa đơn cho khách đến trực tiếp</h1>
                    <p>Giữ nguyên luồng chọn ghế, chỉ thay bước thanh toán PayOS bằng chốt đơn trực tiếp tại quầy.</p>
                </div>
            </div>

            <div className="staff-checkout-layout">
                <section className="staff-checkout-card">
                    <h2>Thông tin khách tại quầy</h2>
                    <div className="staff-form-grid">
                        <label>
                            <span>Tên khách</span>
                            <input value={customer.customerName} onChange={(e) => setCustomer((prev) => ({ ...prev, customerName: e.target.value }))} placeholder="Ví dụ: Nguyễn Văn A" />
                        </label>
                        <label>
                            <span>Email nhận vé (để đội mail nối tiếp)</span>
                            <input value={customer.customerEmail} onChange={(e) => setCustomer((prev) => ({ ...prev, customerEmail: e.target.value }))} placeholder="tenkhach@email.com" />
                        </label>
                        <label>
                            <span>Số điện thoại</span>
                            <input value={customer.customerPhone} onChange={(e) => setCustomer((prev) => ({ ...prev, customerPhone: e.target.value }))} placeholder="09xxxxxxxx" />
                        </label>
                        <label>
                            <span>Phương thức thanh toán</span>
                            <select value={customer.paymentMethod} onChange={(e) => setCustomer((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                                <option value="CASH">Tiền mặt</option>
                                <option value="CARD">Thẻ / POS</option>
                            </select>
                        </label>
                    </div>
                </section>

                <section className="staff-checkout-card">
                    <h2>Khuyến mãi</h2>
                    {promoLoading ? (
                        <p className="staff-hint">Đang tải danh sách khuyến mãi...</p>
                    ) : eligiblePromotions.length === 0 ? (
                        <p className="staff-hint">Hiện chưa có mã khuyến mãi áp dụng tại quầy.</p>
                    ) : (
                        <div className="staff-promo-list">
                            {eligiblePromotions.map((promo) => {
                                const active = selectedPromo?.id === promo.id;
                                return (
                                    <button
                                        key={promo.id}
                                        className={`staff-promo-chip ${active ? "active" : ""}`}
                                        onClick={() => setSelectedPromo(active ? null : promo)}
                                    >
                                        <strong>{promo.code}</strong>
                                        <span>
                                            {promo.discountType === "PERCENTAGE"
                                                ? `Giảm ${promo.discountValue}%`
                                                : `Giảm ${formatCurrency(promo.discountValue)}`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="staff-promo-manual">
                        <input value={codeInput} onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }} placeholder="Nhập mã giảm giá" />
                        <button onClick={handleValidateCode} disabled={codeValidating || !codeInput.trim()}>
                            {codeValidating ? "..." : "Áp dụng"}
                        </button>
                    </div>
                    {codeError && <div className="staff-error-inline">{codeError}</div>}
                </section>

                <aside className="staff-order-card">
                    <h2>Tóm tắt đơn</h2>
                    <div className="staff-order-row"><span>Phim</span><strong>{movieTitle}</strong></div>
                    <div className="staff-order-row"><span>Suất chiếu</span><strong>{formatDateTime(startTime)}</strong></div>
                    <div className="staff-order-row"><span>Phòng</span><strong>{roomName || "—"}</strong></div>
                    <div className="staff-order-row"><span>Ghế</span><strong>{seatDetails.map((s) => s.code).join(", ")}</strong></div>
                    <div className="staff-order-row"><span>Tiền ghế</span><strong>{formatCurrency(seatTotal)}</strong></div>
                    <div className="staff-order-row"><span>Bắp nước</span><strong>{formatCurrency(comboTotal)}</strong></div>
                    {selectedPromo && discountAmount > 0 && (
                        <div className="staff-order-row discount"><span>Giảm giá ({selectedPromo.code})</span><strong>- {formatCurrency(discountAmount)}</strong></div>
                    )}
                    <div className="staff-order-divider" />
                    <div className="staff-order-row total"><span>Tổng thanh toán</span><strong>{formatCurrency(finalTotal)}</strong></div>

                    {cartItems.length > 0 && (
                        <div className="staff-mini-list">
                            {cartItems.map((item) => (
                                <div key={item.id} className="staff-mini-row">
                                    <span>x{item.quantity} {item.name}</span>
                                    <strong>{formatCurrency(item.subtotal)}</strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {submitError && <div className="staff-submit-error">⚠️ {submitError}</div>}

                    <button className="staff-primary-btn" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? "Đang tạo hóa đơn..." : "Xác nhận bán vé tại quầy"}
                    </button>
                    <button className="staff-secondary-btn" onClick={() => navigate(`/staff/showtimes/${showtimeId}/combo`, { state: location.state })}>
                        Quay lại chỉnh combo
                    </button>
                </aside>
            </div>
        </div>
    );
}
