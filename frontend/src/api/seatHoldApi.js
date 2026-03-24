const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// bật dev basic nếu muốn (mặc định false)
const DEV_BASIC_ENABLED = (import.meta.env.VITE_DEV_BASIC || "false") === "true";

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

// ✅ bạn chỉnh key token đúng theo app của bạn
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
 * Quy tắc:
 * - Nếu có Bearer token => dùng Bearer
 * - Nếu không có token => không set Authorization (cho cookie session nếu có)
 * - Nếu DEV_BASIC_ENABLED=true => fallback Basic admin:admin
 */
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

async function request(path, options = {}) {
    const auth = getAuthHeader();
    const token = getBearerToken();

    // Đọc username từ localStorage nếu có (ưu tiên hơn random guestId)
    let username = null;
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.username) username = user.username;
    } catch (_) { }

    // ✅ chỉ gửi X-User-Id khi KHÔNG login (guest mode)
    const guestHeader = token ? {} : { "X-User-Id": username || getGuestId() };

    const headers = {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
        ...guestHeader,
        ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include", // ✅ nếu backend dùng cookie session vẫn chạy
        headers,
    });

    if (!res.ok) {
        let err;
        try {
            err = await res.json();
        } catch (_) {
            err = { message: await res.text() };
        }
        throw { status: res.status, ...err };
    }

    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

export const seatHoldApi = {
    getSeats: (showtimeId) => request(`/api/showtimes/${showtimeId}/seat-states`, { method: "GET" }),

    holdSeats: (showtimeId, seatIds, clientRequestId) =>
        request(`/api/showtimes/${showtimeId}/holds`, {
            method: "POST",
            body: JSON.stringify({ seatIds, clientRequestId }),
        }),

    renewHold: (holdId) => request(`/api/holds/${holdId}/renew`, { method: "POST" }),

    releaseHold: (holdId) => request(`/api/holds/${holdId}`, { method: "DELETE" }),

    confirmHold: (holdId, paymentRef) =>
        request(`/api/orders/confirm`, {
            method: "POST",
            body: JSON.stringify({ holdId, paymentRef }),
        }),

    createMockPayment: (holdId) =>
        request(`/api/payments/mock/create`, {
            method: "POST",
            body: JSON.stringify({ holdId }),
        }),

    confirmMockPayment: (paymentSessionId) =>
        request(`/api/payments/mock/${paymentSessionId}/confirm`, {
            method: "POST",
        }),
};
