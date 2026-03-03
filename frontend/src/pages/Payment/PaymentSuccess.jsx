import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPayment } from '../../api/payosApi';
import './Payment.css';

const PaymentSuccess = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const animRef = useRef(null);

    const orderCode = params.get('orderCode');
    const status = params.get('status') || 'PAID';   // PayOS gửi ?status=PAID trong returnUrl

    const [confirming, setConfirming] = useState(false);
    const [confirmDone, setConfirmDone] = useState(false);

    useEffect(() => {
        // Trigger confetti-like particle burst
        const el = animRef.current;
        if (el) el.classList.add('burst');
    }, []);

    useEffect(() => {
        // Gọi backend /confirm để tạo invoice — đây là fallback quan trọng
        // vì PayOS webhook không thể gọi đến localhost trong môi trường dev.
        if (!orderCode) return;

        setConfirming(true);
        confirmPayment(orderCode, status)
            .then(() => {
                console.info('[PayOS] Invoice confirmed for orderCode=' + orderCode);
            })
            .catch(err => {
                // Không hiện lỗi cho user — invoice vẫn có thể đã được tạo bởi webhook
                console.warn('[PayOS] Confirm request failed (may already exist):', err);
            })
            .finally(() => {
                setConfirming(false);
                setConfirmDone(true);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderCode]);

    return (
        <div className="payment-result-page">
            <div className="result-card success-card" ref={animRef}>
                <div className="result-icon-wrap success-glow">
                    <div className="result-icon">✓</div>
                    <div className="result-rings">
                        <span /><span /><span />
                    </div>
                </div>

                <h1 className="result-title">Thanh toán thành công!</h1>
                <p className="result-sub">
                    {confirming
                        ? 'Đang xác nhận vé của bạn...'
                        : 'Vé của bạn đã được xác nhận. Hãy kiểm tra email để nhận vé nhé!'}
                </p>

                {orderCode && (
                    <div className="result-detail-box">
                        <span className="detail-label">Mã đơn hàng</span>
                        <span className="detail-value">#{orderCode}</span>
                    </div>
                )}

                <div className="result-actions">
                    <button className="btn-result-primary" onClick={() => navigate('/')}>
                        🏠 Về trang chủ
                    </button>
                    <button className="btn-result-secondary" onClick={() => navigate('/booking')}>
                        🎬 Đặt vé khác
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
