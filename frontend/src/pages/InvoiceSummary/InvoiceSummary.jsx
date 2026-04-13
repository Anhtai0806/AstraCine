import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createPaymentLink } from '../../api/payosApi';
import { getAllPromotions, validatePromotion } from '../../api/promotionApi';
import { memberApi } from '../../api/memberApi';
import './InvoiceSummary.css';
import { buildExpiredSeatRedirectState, buildSeatSelectionPath, getRemainingHoldSeconds } from '../../utils/holdSession';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatTimeOnly = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

/** Tính số tiền giảm từ promotion object (Hỗ trợ tách Vé / Bắp nước) */
function calcDiscountFromPromo(promo, seatTotal, comboTotal, grandTotal) {
    if (!promo) return 0;
    const value = parseFloat(promo.discountValue) || 0;
    const minOrder = parseFloat(promo.minOrderAmount) || 0;
    
    let baseAmount = grandTotal; 
    if (promo.applicableTo === 'TICKET') baseAmount = seatTotal;
    else if (promo.applicableTo === 'COMBO') baseAmount = comboTotal;

    if (baseAmount < minOrder) return 0;
    if (baseAmount <= 0) return 0;

    let discount = 0;
    if (promo.discountType === 'PERCENTAGE') {
        discount = Math.round(baseAmount * value / 100);
    } else if (promo.discountType === 'FIXED') {
        discount = value;
    }

    return Math.min(discount, baseAmount);
}

/** Lọc promo còn hiệu lực phía client */
function isPromoValid(p) {
    if (p.status !== 'ACTIVE') return false;
    const today = new Date().toISOString().slice(0, 10);
    if (p.startDate && p.startDate > today) return false;
    if (p.endDate && p.endDate < today) return false;
    if (p.maxUsage != null && p.currentUsage >= p.maxUsage) return false;
    return true;
}

/** Hàm kiểm tra xem Mã này có được phép HIỂN THỊ / ÁP DỤNG cho giỏ hàng hiện tại không */
function isPromoEligibleForOrder(promo, seatTotal, comboTotal, grandTotal) {
    if (!promo) return false;

    // Chặn nếu sai mục đích
    if (promo.applicableTo === 'TICKET' && seatTotal <= 0) return false;
    if (promo.applicableTo === 'COMBO' && comboTotal <= 0) return false;

    // Kiểm tra điều kiện "Đơn hàng tối thiểu" dựa trên loại mã
    const minOrder = parseFloat(promo.minOrderAmount) || 0;
    let amountToCheck = grandTotal;
    if (promo.applicableTo === 'TICKET') amountToCheck = seatTotal;
    else if (promo.applicableTo === 'COMBO') amountToCheck = comboTotal;

    return amountToCheck >= minOrder;
}

const InvoiceSummary = () => {
    const { showtimeId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const {
        holdId,
        seatDetails = [],
        seatTotal = 0,
        cartItems = [],
        comboTotal = 0,
        grandTotal = 0,
        movieTitle,
        startTime,
        endTime,
        roomName,
        holdExpiresAt = null,
    } = location.state || {};

    const [promotions, setPromotions] = useState([]);
    const [promoLoading, setPromoLoading] = useState(true);
    const [codeInput, setCodeInput] = useState('');
    const [codeError, setCodeError] = useState(null);
    const [codeValidating, setCodeValidating] = useState(false);

    // Khe cắm Mã Khuyến Mãi
    const [promoTicket, setPromoTicket] = useState(null); 
    const [promoCombo, setPromoCombo] = useState(null);   

    const [availablePoints, setAvailablePoints] = useState(0);
    const [pointsUsed, setPointsUsed] = useState(0);
    const [pointInput, setPointInput] = useState('');

    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState(null);

    const holdExpiredHandledRef = useRef(false);

    useEffect(() => {
        if (!holdId || !holdExpiresAt) {
            holdExpiredHandledRef.current = false;
            return;
        }

        const seatPath = buildSeatSelectionPath(false, showtimeId);
        const seatState = buildExpiredSeatRedirectState({ movieTitle, startTime, endTime, roomName });

        const handleExpired = () => {
            if (holdExpiredHandledRef.current) return;
            holdExpiredHandledRef.current = true;
            setPayError('Phiên giữ ghế đã hết hạn. Vui lòng chọn lại ghế.');
            alert('Đã hết thời gian giữ ghế. Hệ thống sẽ đưa bạn về màn hình chọn ghế.');
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
    }, [holdId, holdExpiresAt, movieTitle, navigate, roomName, showtimeId, startTime, endTime]);

    useEffect(() => {
        if (!user) {
            navigate("/login", { state: { returnUrl: `/booking/showtimes/${showtimeId}` } });
            return;
        }

        const userId = user.id || user.userId;
        if (userId) {
            memberApi.getProfile(userId)
                .then(res => setAvailablePoints(res.data.points || 0))
                .catch(err => console.error("Lỗi lấy điểm thành viên:", err));
        }

        getAllPromotions()
            .then(data => {
                const valid = (data || []).filter(isPromoValid);
                setPromotions(valid);
            })
            .catch(err => console.warn('[Promo] load failed:', err))
            .finally(() => setPromoLoading(false));
    }, [user, navigate, showtimeId]);

    const eligiblePromotions = useMemo(
        () => promotions.filter((promo) => isPromoEligibleForOrder(promo, seatTotal, comboTotal, grandTotal)),
        [promotions, seatTotal, comboTotal, grandTotal]
    );

    useEffect(() => {
        if (promoTicket && !isPromoEligibleForOrder(promoTicket, seatTotal, comboTotal, grandTotal)) setPromoTicket(null);
        if (promoCombo && !isPromoEligibleForOrder(promoCombo, seatTotal, comboTotal, grandTotal)) setPromoCombo(null);
    }, [promoTicket, promoCombo, seatTotal, comboTotal, grandTotal]);

    const ticketDiscountAmount = useMemo(() => calcDiscountFromPromo(promoTicket, seatTotal, comboTotal, grandTotal), [promoTicket, seatTotal, comboTotal, grandTotal]);
    const comboDiscountAmount = useMemo(() => calcDiscountFromPromo(promoCombo, seatTotal, comboTotal, grandTotal), [promoCombo, seatTotal, comboTotal, grandTotal]);
    const discountAmount = ticketDiscountAmount + comboDiscountAmount;

    useEffect(() => {
        const remainingBill = Math.max(0, grandTotal - discountAmount);
        const maxPointsNeeded = Math.ceil(remainingBill / 1000);
        if (pointsUsed > maxPointsNeeded) {
            setPointsUsed(maxPointsNeeded);
            if (pointInput) setPointInput(maxPointsNeeded.toString());
        }
    }, [discountAmount, grandTotal, pointsUsed, pointInput]);

    const pointsDiscountAmount = pointsUsed * 1000;
    const totalDiscount = discountAmount + pointsDiscountAmount;
    const finalTotal = Math.max(0, grandTotal - totalDiscount);

    // 🚀 ĐÃ SỬA: Hàm tự động thay thế mã cực kỳ thông minh
    const applyPromoToSlot = (promo) => {
        setCodeError(null);
        setCodeInput('');

        // Bấm lại mã đang chọn -> Hủy chọn
        if (promoTicket?.id === promo.id) { setPromoTicket(null); return; }
        if (promoCombo?.id === promo.id) { setPromoCombo(null); return; }

        if (promo.applicableTo === 'ALL') {
            // Áp mã ALL -> Xóa sạch mã Vé và Bắp hiện tại, một mình nó ôm hết
            setPromoTicket(promo);
            setPromoCombo(null);
        } 
        else if (promo.applicableTo === 'TICKET') {
            // Áp mã Vé -> Đè lên mã vé cũ. Nếu đang có mã ALL thì mã ALL bị đá bay luôn
            setPromoTicket(promo);
            if (promoCombo?.applicableTo === 'ALL') setPromoCombo(null); 
        } 
        else if (promo.applicableTo === 'COMBO') {
            // Áp mã Bắp -> Đè lên mã bắp cũ
            setPromoCombo(promo);
            // Nếu đang xài mã ALL (lưu ở khe vé), phải đá mã ALL đi để tránh giảm kép
            if (promoTicket?.applicableTo === 'ALL') {
                setPromoTicket(null);
            }
        }
    };

    const handleValidateCode = async () => {
        const code = codeInput.trim().toUpperCase();
        if (!code) return;
        setCodeError(null);
        setCodeValidating(true);
        try {
            const promo = await validatePromotion(code);
            
            if (!isPromoValid(promo)) {
                throw new Error('Mã không còn hiệu lực hoặc đã hết lượt sử dụng.');
            }

            if (!isPromoEligibleForOrder(promo, seatTotal, comboTotal, grandTotal)) {
                let errorMsg = 'Đơn hàng của bạn không đủ điều kiện áp dụng mã này.';
                if (promo.applicableTo === 'TICKET' && seatTotal <= 0) errorMsg = 'Mã này chỉ áp dụng cho Vé xem phim!';
                else if (promo.applicableTo === 'COMBO' && comboTotal <= 0) errorMsg = 'Mã này chỉ áp dụng cho Bắp nước!';
                else {
                    const minOrder = parseFloat(promo.minOrderAmount) || 0;
                    let typeLabel = promo.applicableTo === 'TICKET' ? "tiền vé" : "tiền bắp nước";
                    errorMsg = `Tổng ${typeLabel} tối thiểu ${formatCurrency(minOrder)} mới áp dụng được mã này.`;
                }
                throw new Error(errorMsg);
            }

            applyPromoToSlot(promo);
        } catch (err) {
            setCodeError(err?.message || 'Mã không hợp lệ hoặc đã hết hạn.');
        } finally {
            setCodeValidating(false);
        }
    };

    const handleApplyPoints = () => {
        const pts = parseInt(pointInput, 10) || 0;
        
        if (pts <= 0) {
            setPointsUsed(0);
            return;
        }

        if (pts < 20) {
            alert("Bạn phải đổi ít nhất 20 điểm (20.000đ) mỗi lần sử dụng!");
            return;
        }

        if (pts > availablePoints) {
            alert(`Bạn chỉ có tối đa ${availablePoints} điểm!`);
            return;
        }
        
        const remainingBill = Math.max(0, grandTotal - discountAmount);
        const maxPointsNeeded = Math.ceil(remainingBill / 1000);

        if (pts > maxPointsNeeded) {
            if (maxPointsNeeded < 20) {
                alert(`Đơn hàng của bạn chỉ cần ${maxPointsNeeded} điểm để thanh toán, nhưng hệ thống yêu cầu dùng tối thiểu 20 điểm. Vui lòng thanh toán bằng phương thức khác!`);
                setPointsUsed(0);
                setPointInput('');
            } else {
                alert(`Bạn chỉ cần dùng tối đa ${maxPointsNeeded} điểm cho đơn này.`);
                setPointsUsed(maxPointsNeeded);
                setPointInput(maxPointsNeeded.toString());
            }
        } else {
            setPointsUsed(pts);
        }
    };

    const handlePayment = async () => {
        if (!holdId) {
            setPayError('Phiên giữ ghế đã hết hạn. Vui lòng chọn ghế lại.');
            return;
        }
        setPayError(null);
        setPaying(true);
        try {
            const origin = window.location.origin;
            const returnUrl = `${origin}/payment/success`;
            const cancelUrl = `${origin}/payment/cancel?holdId=${encodeURIComponent(holdId)}`;

            const comboPayload = cartItems.map(item => ({
                comboId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
            }));

            const appliedCodes = [promoTicket?.code, promoCombo?.code].filter(Boolean);

            const result = await createPaymentLink(
                holdId, returnUrl, cancelUrl,
                finalTotal,
                appliedCodes.length > 0 ? appliedCodes : null, 
                comboPayload,
                totalDiscount > 0 ? totalDiscount : null,
                pointsUsed > 0 ? pointsUsed : 0
            );

            if (result?.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                setPayError('Không nhận được phản hồi từ hệ thống. Vui lòng thử lại.');
                setPaying(false);
            }
        } catch (err) {
            console.error('[Payment] Create payment link failed:', err);
            const msg = err?.message || err?.error || 'Có lỗi xảy ra khi xử lý giao dịch.';
            setPayError(msg);
            setPaying(false);
        }
    };

    return (
        <div className="invoice-page">
            <div className="booking-steps">
                <span className="step done">1. Chọn ghế</span>
                <span className="step-arrow">›</span>
                <span className="step done">2. Chọn bắp nước</span>
                <span className="step-arrow">›</span>
                <span className="step active">3. Tóm tắt hoá đơn</span>
                <span className="step-arrow">›</span>
                <span className="step">4. Thanh toán</span>
            </div>

            <h1 className="invoice-title">Tóm Tắt Hoá Đơn</h1>

            <div className="invoice-layout">
                {/* ===== LEFT COLUMN ===== */}
                <div className="invoice-left">

                    <section className="invoice-card">
                        <div className="invoice-card-header">
                            <span className="card-icon">🎬</span>
                            <h2 className="card-title">Thông tin phim</h2>
                        </div>
                        <div className="info-grid">
                            <div className="info-row">
                                <span className="info-label">Tên phim</span>
                                <span className="info-value highlight">{movieTitle || '—'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Suất chiếu</span>
                                <span className="info-value">
                                    {startTime ? (
                                        <>
                                            {formatDateTime(startTime)}
                                            {endTime && <> → {formatTimeOnly(endTime)}</>}
                                        </>
                                    ) : '—'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Phòng chiếu</span>
                                <span className="info-value">{roomName || 'Chưa có thông tin'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Ghế ({seatDetails.length})</span>
                                <span className="info-value seat-list">
                                    {seatDetails.length === 0 ? '—' :
                                        seatDetails
                                            .slice()
                                            .sort((a, b) => a.code.localeCompare(b.code))
                                            .map(s => (
                                                <span key={s.seatId} className="seat-tag">
                                                    {s.code}
                                                    <span className="seat-tag-type">{s.seatType}</span>
                                                </span>
                                            ))
                                    }
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="invoice-card">
                        <div className="invoice-card-header">
                            <span className="card-icon">👤</span>
                            <h2 className="card-title">Thông tin nhận vé</h2>
                        </div>
                        {user ? (
                            <div className="info-grid">
                                <div className="info-row">
                                    <span className="info-label">Họ và tên</span>
                                    <span className="info-value">
                                        {user.fullName || user.name || user.username || '—'}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Email</span>
                                    <span className="info-value">{user.email || '—'}</span>
                                </div>
                            </div>
                        ) : (
                            <p className="invoice-notice">
                                Bạn chưa đăng nhập.{' '}
                                <span className="link-text" onClick={() => navigate('/login')}>
                                    Đăng nhập ngay
                                </span>
                            </p>
                        )}
                    </section>

                    <section className="invoice-card">
                        <div className="invoice-card-header">
                            <span className="card-icon">⭐</span>
                            <h2 className="card-title">Đổi điểm thành viên</h2>
                        </div>
                        <p className="discount-hint">
                            Bạn đang có: <strong>{availablePoints} điểm</strong> (1 điểm = 1.000đ)<br/>
                            <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>* Sử dụng tối thiểu 20 điểm/lần</span>
                        </p>
                        <div className="promo-input-row">
                            <input
                                type="number"
                                className="promo-input"
                                placeholder="Nhập số điểm muốn dùng..."
                                value={pointInput}
                                min="0"
                                max={availablePoints}
                                onChange={e => setPointInput(e.target.value)}
                                disabled={availablePoints < 20}
                            />
                            <button
                                className="btn-apply-code"
                                onClick={handleApplyPoints}
                                disabled={availablePoints < 20}
                            >
                                Đổi điểm
                            </button>
                        </div>
                        
                        {pointsUsed > 0 && (
                            <div className="discount-applied" style={{ marginTop: '12px' }}>
                                <span>✅ Đã dùng: <strong>{pointsUsed} điểm</strong></span>
                                <span className="discount-saving">– {formatCurrency(pointsDiscountAmount)}</span>
                                <button className="btn-remove-promo" onClick={() => { setPointsUsed(0); setPointInput(''); }}>✕</button>
                            </div>
                        )}
                    </section>

                    <section className="invoice-card">
                        <div className="invoice-card-header">
                            <span className="card-icon">🏷️</span>
                            <h2 className="card-title">Mã giảm giá (Tối đa 1 Vé + 1 Bắp)</h2>
                        </div>
                        {promoLoading ? (
                            <p className="discount-hint">Đang tải mã giảm giá...</p>
                        ) : eligiblePromotions.length === 0 ? (
                            <p className="discount-hint">Hiện không có mã khuyến mãi nào áp dụng được cho đơn này.</p>
                        ) : (
                            <>
                                <p className="discount-hint">Chọn một mã hoặc nhập thủ công:</p>
                                <div className="discount-list">
                                    {eligiblePromotions.map(promo => {
                                        const isSelected = promoTicket?.id === promo.id || promoCombo?.id === promo.id;
                                        const saving = calcDiscountFromPromo(promo, seatTotal, comboTotal, grandTotal);
                                        
                                        let typeText = "";
                                        if (promo.applicableTo === "TICKET") typeText = " (Vé)";
                                        else if (promo.applicableTo === "COMBO") typeText = " (Bắp nước)";
                                        else if (promo.applicableTo === "ALL") typeText = " (Toàn bộ)";

                                        const label = promo.discountType === 'PERCENTAGE'
                                            ? `Giảm ${promo.discountValue}%${typeText}`
                                            : `Giảm ${formatCurrency(promo.discountValue)}${typeText}`;

                                        return (
                                            <button
                                                key={promo.id}
                                                className={`discount-chip ${isSelected ? 'selected' : ''}`}
                                                onClick={() => applyPromoToSlot(promo)}
                                                title={promo.description || label}
                                            >
                                                <span className="chip-code">{promo.code}</span>
                                                <span className="chip-label">{label}</span>
                                                {saving > 0 && !isSelected && (
                                                    <span className="chip-saving">– {formatCurrency(saving)}</span>
                                                )}
                                                {isSelected && <span className="chip-check">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        <div className="promo-input-row" style={{ marginTop: '15px' }}>
                            <input
                                type="text"
                                className="promo-input"
                                placeholder="Nhập mã giảm giá..."
                                value={codeInput}
                                onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }}
                                onKeyDown={e => e.key === 'Enter' && handleValidateCode()}
                            />
                            <button
                                className="btn-apply-code"
                                onClick={handleValidateCode}
                                disabled={codeValidating || !codeInput.trim()}
                            >
                                {codeValidating ? '...' : 'Áp dụng'}
                            </button>
                        </div>
                        {codeError && <p className="code-error">{codeError}</p>}

                        {promoTicket && (
                            <div className="discount-applied" style={{ marginTop: '10px' }}>
                                <span>🎟️ Mã {promoTicket.applicableTo === 'ALL' ? 'Toàn bộ' : 'Vé'}: <strong>{promoTicket.code}</strong></span>
                                <span className="discount-saving">– {formatCurrency(ticketDiscountAmount)}</span>
                                <button className="btn-remove-promo" onClick={() => setPromoTicket(null)}>✕</button>
                            </div>
                        )}
                        
                        {promoCombo && (
                            <div className="discount-applied" style={{ marginTop: '10px' }}>
                                <span>🍿 Mã bắp: <strong>{promoCombo.code}</strong></span>
                                <span className="discount-saving">– {formatCurrency(comboDiscountAmount)}</span>
                                <button className="btn-remove-promo" onClick={() => setPromoCombo(null)}>✕</button>
                            </div>
                        )}
                    </section>
                </div>

                <aside className="invoice-right">
                    <div className="payment-card">
                        <h2 className="payment-title">💰 Thông tin thanh toán</h2>

                        <div className="payment-rows">
                            <div className="payment-row">
                                <span>Tiền ghế ({seatDetails.length} ghế)</span>
                                <span>{formatCurrency(seatTotal)}</span>
                            </div>

                            {cartItems.length > 0 && (
                                <>
                                    <div className="payment-divider" />
                                    {cartItems.map(item => (
                                        <div className="payment-row combo-row" key={item.id}>
                                            <span>
                                                <span className="combo-qty-badge">×{item.quantity}</span>
                                                {item.name}
                                            </span>
                                            <span>{formatCurrency(item.subtotal)}</span>
                                        </div>
                                    ))}
                                    <div className="payment-row subtotal-row">
                                        <span>Tạm tính bắp nước</span>
                                        <span>{formatCurrency(comboTotal)}</span>
                                    </div>
                                </>
                            )}

                            {cartItems.length === 0 && (
                                <div className="payment-row muted-row">
                                    <span>Bắp nước</span>
                                    <span>Không có</span>
                                </div>
                            )}

                            <div className="payment-divider" />

                            <div className="payment-row total-before-row">
                                <span>Tổng trước giảm giá</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>

                            {promoTicket && ticketDiscountAmount > 0 && (
                                <div className="payment-row discount-row">
                                    <span>Giảm giá {promoTicket.applicableTo === 'ALL' ? 'đơn' : 'vé'} <em>({promoTicket.code})</em></span>
                                    <span className="discount-value">– {formatCurrency(ticketDiscountAmount)}</span>
                                </div>
                            )}
                            {promoCombo && comboDiscountAmount > 0 && (
                                <div className="payment-row discount-row">
                                    <span>Giảm giá bắp <em>({promoCombo.code})</em></span>
                                    <span className="discount-value">– {formatCurrency(comboDiscountAmount)}</span>
                                </div>
                            )}

                            {pointsUsed > 0 && (
                                <div className="payment-row discount-row">
                                    <span>Dùng {pointsUsed} điểm</span>
                                    <span className="discount-value">– {formatCurrency(pointsDiscountAmount)}</span>
                                </div>
                            )}
                        </div>

                        <div className="payment-grand-total">
                            <span>Tổng thanh toán</span>
                            <span className="grand-amount">{formatCurrency(finalTotal)}</span>
                        </div>

                        <button
                            className={`btn-pay${paying ? ' btn-pay--loading' : ''}`}
                            onClick={handlePayment}
                            disabled={paying || (getRemainingHoldSeconds(holdExpiresAt) ?? 0) <= 0}
                        >
                            {paying ? (
                                <><span className="pay-spinner" /> Đang xử lý giao dịch...</>
                            ) : finalTotal === 0 ? (
                                '✅ Xác nhận vé (0đ)'
                            ) : (
                                '💳 Xác nhận & Thanh toán PayOS'
                            )}
                        </button>

                        {payError && (
                            <div className="pay-error-box">
                                ⚠️ {payError}
                            </div>
                        )}

                        <button className="btn-invoice-back" onClick={() => navigate(`/booking/showtimes/${showtimeId}/combo`, { state: location.state })}>
                            ← Quay lại chọn bắp nước
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default InvoiceSummary;