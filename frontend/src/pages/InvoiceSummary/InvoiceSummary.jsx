import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createPaymentLink } from '../../api/payosApi';
import { getAllPromotions, validatePromotion } from '../../api/promotionApi';
import './InvoiceSummary.css';

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

/** Tính số tiền giảm từ promotion object (backend format) */
function calcDiscountFromPromo(promo, baseTotal) {
    if (!promo) return 0;
    const value = parseFloat(promo.discountValue) || 0;
    const minOrder = parseFloat(promo.minOrderAmount) || 0;
    if (baseTotal < minOrder) return 0;
    if (promo.discountType === 'PERCENTAGE') return Math.round(baseTotal * value / 100);
    if (promo.discountType === 'FIXED') return Math.min(value, baseTotal);
    return 0;
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
    } = location.state || {};

    // ── Promotion state ──────────────────────────────────────────
    const [promotions, setPromotions] = useState([]);      // all valid promos from DB
    const [promoLoading, setPromoLoading] = useState(true);
    const [selectedPromo, setSelectedPromo] = useState(null); // chosen promo object
    const [codeInput, setCodeInput] = useState('');         // manual code input
    const [codeError, setCodeError] = useState(null);
    const [codeValidating, setCodeValidating] = useState(false);

    // ── Payment state ─────────────────────────────────────────────
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState(null);

    // ── Load promotions from DB on mount ─────────────────────────
    useEffect(() => {
        getAllPromotions()
            .then(data => {
                const valid = (data || []).filter(isPromoValid);
                setPromotions(valid);
            })
            .catch(err => console.warn('[Promo] load failed:', err))
            .finally(() => setPromoLoading(false));
    }, []);

    // ── Discount calculation ──────────────────────────────────────
    const discountAmount = useMemo(() =>
        calcDiscountFromPromo(selectedPromo, grandTotal),
        [selectedPromo, grandTotal]
    );

    const finalTotal = Math.max(0, grandTotal - discountAmount);

    // ── Handlers ──────────────────────────────────────────────────
    const handleSelectChip = (promo) => {
        setCodeError(null);
        setCodeInput('');
        setSelectedPromo(prev => prev?.id === promo.id ? null : promo);
    };

    const handleValidateCode = async () => {
        const code = codeInput.trim().toUpperCase();
        if (!code) return;
        setCodeError(null);
        setCodeValidating(true);
        try {
            const promo = await validatePromotion(code);
            if (!isPromoValid(promo)) throw new Error('Mã không còn hiệu lực.');
            const minOrder = parseFloat(promo.minOrderAmount) || 0;
            if (grandTotal < minOrder) {
                setCodeError(`Đơn tối thiểu ${formatCurrency(minOrder)} mới áp dụng được mã này.`);
                setCodeValidating(false);
                return;
            }
            setSelectedPromo(promo);
            setCodeInput('');
        } catch (err) {
            setCodeError(err?.message || 'Mã không hợp lệ hoặc đã hết hạn.');
        } finally {
            setCodeValidating(false);
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
            const cancelUrl = `${origin}/payment/cancel`;

            const comboPayload = cartItems.map(item => ({
                comboId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
            }));

            const result = await createPaymentLink(
                holdId, returnUrl, cancelUrl,
                finalTotal,
                selectedPromo?.code ?? null,
                comboPayload,
            );

            if (result?.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                setPayError('Không nhận được link thanh toán từ PayOS. Vui lòng thử lại.');
                setPaying(false);
            }
        } catch (err) {
            console.error('[PayOS] Create payment link failed:', err);
            const msg = err?.message || err?.error || 'Có lỗi xảy ra khi tạo link thanh toán.';
            setPayError(msg);
            setPaying(false);
        }
    };

    const handleGoBack = () => {
        navigate(`/booking/showtimes/${showtimeId}/combo`, { state: location.state });
    };

    return (
        <div className="invoice-page">
            {/* Breadcrumb */}
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

                    {/* --- Thông tin phim --- */}
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

                    {/* --- Thông tin nhận vé --- */}
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

                    {/* --- Mã giảm giá --- */}
                    <section className="invoice-card">
                        <div className="invoice-card-header">
                            <span className="card-icon">🏷️</span>
                            <h2 className="card-title">Mã giảm giá</h2>
                        </div>
                        {/* Chips từ DB */}
                        {promoLoading ? (
                            <p className="discount-hint">Đang tải mã giảm giá...</p>
                        ) : promotions.length === 0 ? (
                            <p className="discount-hint">Hiện không có mã khuyến mãi nào.</p>
                        ) : (
                            <>
                                <p className="discount-hint">Chọn một mã hoặc nhập thủ công:</p>
                                <div className="discount-list">
                                    {promotions.map(promo => {
                                        const isSelected = selectedPromo?.id === promo.id;
                                        const saving = calcDiscountFromPromo(promo, grandTotal);
                                        const label = promo.discountType === 'PERCENTAGE'
                                            ? `Giảm ${promo.discountValue}%`
                                            : `Giảm ${formatCurrency(promo.discountValue)}`;
                                        return (
                                            <button
                                                key={promo.id}
                                                className={`discount-chip ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleSelectChip(promo)}
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

                        {/* Nhập mã thủ công */}
                        <div className="promo-input-row">
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

                        {/* Đã áp dụng */}
                        {selectedPromo && (
                            <div className="discount-applied">
                                <span>✅ Đã áp dụng: <strong>{selectedPromo.code}</strong></span>
                                <span className="discount-saving">– {formatCurrency(discountAmount)}</span>
                                <button className="btn-remove-promo" onClick={() => setSelectedPromo(null)}>✕</button>
                            </div>
                        )}
                    </section>
                </div>

                {/* ===== RIGHT COLUMN: Thanh toán ===== */}
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

                            {selectedPromo && discountAmount > 0 && (
                                <div className="payment-row discount-row">
                                    <span>Giảm giá <em>({selectedPromo.code})</em></span>
                                    <span className="discount-value">– {formatCurrency(discountAmount)}</span>
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
                            disabled={paying}
                        >
                            {paying ? (
                                <><span className="pay-spinner" /> Đang tạo link thanh toán...</>
                            ) : (
                                '💳 Xác nhận & Thanh toán PayOS'
                            )}
                        </button>

                        {payError && (
                            <div className="pay-error-box">
                                ⚠️ {payError}
                            </div>
                        )}

                        <button className="btn-invoice-back" onClick={handleGoBack}>
                            ← Quay lại chọn bắp nước
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default InvoiceSummary;
