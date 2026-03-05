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

// bật dev basic nếu muốn (mặc định false)
const DEV_BASIC_ENABLED = (import.meta.env.VITE_DEV_BASIC || "false") === "true";

function getAuthHeader() {
    const token = getBearerToken();
    if (token) return `Bearer ${token}`;

    if (DEV_BASIC_ENABLED) {
        const stored = localStorage.getItem("basicAuth");
        if (stored) return stored.startsWith("Basic ") ? stored : `Basic ${stored}`;
        return `Basic ${btoa("admin:admin")}`;
    }

    return null;
}

/**
 * Quy tắc auth (giống seatHoldApi.js):
 * - Có Bearer token → dùng Bearer, KHÔNG gửi X-User-Id
 * - Không có token  → đọc localStorage "user", nếu có gắn vào X-User-Id. Nếu không có dùng random guestId
 * - Có DEV_BASIC_ENABLED → fallback Basic
 */
async function request(path, options = {}) {
    const auth = getAuthHeader();
    const token = getBearerToken();

    let username = null;
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.username) {
            username = user.username;
        }
    } catch (_) { }

    const guestHeader = token ? {} : { "X-User-Id": username || getGuestId() };

    const headers = {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
        ...guestHeader,
        ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include",
        headers,
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
 * @param {number} discountAmount - Số tiền được giảm (để hiển thị trong PayOS)
 */
export async function createPaymentLink(holdId, returnUrl, cancelUrl, amount, promotionCode, comboItems, discountAmount) {
    return request("/api/payments/payos/create", {
        method: "POST",
        body: JSON.stringify({
            holdId,
            returnUrl,
            cancelUrl,
            amount: Math.round(amount),
            promotionCode: promotionCode || null,
            comboItems: comboItems || [],
            discountAmount: discountAmount ? Math.round(discountAmount) : null,
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
