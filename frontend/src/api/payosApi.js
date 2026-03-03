const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

function getGuestId() {
    const key = "guestUserId";
    let id = localStorage.getItem(key);
    if (id) return id;
    try {
        id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    } catch (_) {
        id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    localStorage.setItem(key, id);
    return id;
}

/**
 * Lấy Bearer token nếu user đã đăng nhập.
 * Các key token phải khớp với những gì AuthContext lưu.
 */
function getBearerToken() {
    return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        null
    );
}

/**
 * Quy tắc auth (giống seatHoldApi.js):
 * - Có Bearer token → dùng Bearer, KHÔNG gửi X-User-Id
 * - Không có token  → không gửi Authorization, gửi X-User-Id (guestId)
 *
 * ⚠️ KHÔNG fallback Basic auth:
 *    Basic admin:admin khiến backend resolve userId="admin"
 *    nhưng hold được lưu dưới guestId → HOLD_NOT_FOUND
 */
async function request(path, options = {}) {
    const token = getBearerToken();

    const authHeaders = token
        ? { Authorization: `Bearer ${token}` }
        : { "X-User-Id": getGuestId() };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        let err;
        try { err = await res.json(); } catch (_) { err = { message: await res.text() }; }
        throw { status: res.status, ...err };
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

/**
 * Tạo PayOS payment link.
 * @param {string} holdId
 * @param {string} returnUrl
 * @param {string} cancelUrl
 * @param {number} amount - Số tiền thực tế (VND, sau giảm giá)
 * @param {string|null} promotionCode - Mã khuyến mãi đã áp dụng
 * @param {Array} comboItems - Danh sách combo [{comboId, name, quantity, price, subtotal}]
 */
export async function createPaymentLink(holdId, returnUrl, cancelUrl, amount, promotionCode, comboItems) {
    return request("/api/payments/payos/create", {
        method: "POST",
        body: JSON.stringify({
            holdId,
            returnUrl,
            cancelUrl,
            amount: Math.round(amount),
            promotionCode: promotionCode || null,
            comboItems: comboItems || [],
        }),
    });
}

/**
 * Xác nhận thanh toán sau khi PayOS redirect về trang success.
 * Gọi endpoint này ngay khi load PaymentSuccess page để tạo invoice.
 * @param {number|string} orderCode  - Mã đơn từ URL param ?orderCode=...
 * @param {string} status            - Trạng thái từ URL param ?status=PAID
 */
export async function confirmPayment(orderCode, status = "PAID") {
    return request(`/api/payments/payos/confirm/${orderCode}?status=${encodeURIComponent(status)}`, {
        method: "POST",
    });
}
