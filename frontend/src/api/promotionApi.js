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

function getAuthHeader() {
    const token = getBearerToken();
    if (token) return `Bearer ${token}`;
    return null;
}

async function request(path, options = {}) {
    let username = null;
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.username) {
            username = user.username;
        }
    } catch (_) { }

    const auth = getAuthHeader();
    const token = getBearerToken();
    const guestHeader = token ? {} : { "X-User-Id": username || localStorage.getItem("guestUserId") || "anonymous" };

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
 * Lấy tất cả promotions (để lọc ACTIVE phía FE).
 * @returns {Promise<Array>}
 */
export async function getAllPromotions() {
    return request("/api/promotions");
}

/**
 * Validate một mã promotion theo code.
 * Throws nếu không hợp lệ / hết hạn / hết lượt.
 * @param {string} code
 * @returns {Promise<Object>} PromotionDTO
 */
export async function validatePromotion(code) {
    return request(`/api/promotions/validate/${encodeURIComponent(code)}`);
}
