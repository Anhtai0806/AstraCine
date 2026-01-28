import { useEffect, useState } from "react";
import QRCode from "qrcode";
import "./PaymentQrModal.css";

export default function PaymentQrModal({ open, payment, remainingSeconds, onClose, onConfirmPaid, busy }) {
  const [dataUrl, setDataUrl] = useState(null);
  const payload = payment?.qrPayload;

  useEffect(() => {
    let mounted = true;
    setDataUrl(null);
    if (!open || !payload) return;

    QRCode.toDataURL(payload, { margin: 1, width: 220 })
      .then((url) => {
        if (mounted) setDataUrl(url);
      })
      .catch(() => {
        if (mounted) setDataUrl(null);
      });

    return () => {
      mounted = false;
    };
  }, [open, payload]);

  if (!open) return null;

  return (
    <div className="payment-modal-overlay" role="dialog" aria-modal="true">
      <div className="payment-modal">
        <div className="payment-modal-header">
          <h3>Thanh toán (Mock)</h3>
          <button className="payment-x" onClick={onClose} disabled={busy} aria-label="Close">
            ×
          </button>
        </div>

        <div className="payment-modal-body">
          <div className="payment-summary">
            <div>
              <div className="label">Số tiền</div>
              <div className="value">{formatVnd(payment?.amount)}</div>
            </div>
            <div>
              <div className="label">Hold còn lại</div>
              <div className="value">{remainingSeconds ?? "-"}s</div>
            </div>
          </div>

          <div className="qr-box">
            {dataUrl ? (
              <img src={dataUrl} alt="QR" />
            ) : (
              <div className="qr-fallback">
                <div className="small">Không render được QR. Copy payload:</div>
                <code>{payload}</code>
              </div>
            )}
          </div>

          <div className="hint">
            MVP: bấm <b>Tôi đã thanh toán</b> để xác nhận (mock). Sau này sẽ thay bằng webhook/callback.
          </div>
        </div>

        <div className="payment-modal-footer">
          <button className="btn" onClick={onClose} disabled={busy}>
            Đóng
          </button>
          <button className="btn primary" onClick={onConfirmPaid} disabled={busy}>
            {busy ? "Đang xử lý..." : "Tôi đã thanh toán"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatVnd(amount) {
  if (amount == null) return "-";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  } catch (_) {
    return `${amount} VND`;
  }
}
