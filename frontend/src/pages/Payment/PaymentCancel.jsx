import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { seatHoldApi } from '../../api/seatHoldApi';
import './Payment.css';

const PaymentCancel = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const orderCode = params.get('orderCode');
    const holdId = params.get('holdId');
    const releasedRef = useRef(false);

    // Tự động giải phóng hold khi user hủy thanh toán
    useEffect(() => {
        if (!holdId || releasedRef.current) return;
        releasedRef.current = true;

        seatHoldApi.releaseHold(holdId)
            .then(() => console.info('[PaymentCancel] Hold released:', holdId))
            .catch(err => console.warn('[PaymentCancel] Release hold failed (may already expired):', err));
    }, [holdId]);

    return (
        <div className="payment-result-page">
            <div className="result-card cancel-card">
                <div className="result-icon-wrap cancel-glow">
                    <div className="result-icon cancel-icon">✕</div>
                    <div className="result-rings cancel-rings">
                        <span /><span /><span />
                    </div>
                </div>

                <h1 className="result-title">Thanh toán bị huỷ</h1>
                <p className="result-sub">
                    Bạn đã huỷ thanh toán. Ghế đã được giải phóng để người khác có thể đặt.
                </p>

                {orderCode && (
                    <div className="result-detail-box">
                        <span className="detail-label">Mã đơn hàng</span>
                        <span className="detail-value">#{orderCode}</span>
                    </div>
                )}

                <p className="result-notice">
                    💡 Bạn có thể quay lại và chọn ghế mới để tiếp tục đặt vé.
                </p>

                <div className="result-actions">
                    <button className="btn-result-back" onClick={() => navigate('/')}>
                        🏠 Về trang chủ
                    </button>
                    <button className="btn-result-secondary" onClick={() => navigate('/movies')}>
                        🎬 Xem phim khác
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancel;
