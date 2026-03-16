const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

function getBearerToken() {
    return (
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        null
    );
}

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

function getAuthHeader() {
    const token = getBearerToken();
    if (token) return `Bearer ${token}`;
    return null;
}

async function request(path) {
    const auth = getAuthHeader();
    const token = getBearerToken();

    let username = null;
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.username) username = user.username;
    } catch (_) {}

    const guestHeader = token ? {} : { "X-User-Id": username || getGuestId() };

    const headers = {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
        ...guestHeader,
    };

    const res = await fetch(`${API_BASE}${path}`, {
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
 * Lấy thông tin E-ticket theo orderCode.
 * Dùng khi user F5 trang vé hoặc truy cập trực tiếp.
 * @param {string|number} orderCode - Mã đơn PayOS
 */
export async function getETicket(orderCode) {
    return request(`/api/payments/payos/ticket/${orderCode}`);
}
