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
    // Thêm logic đọc username từ thay cho token thật (vì token đang là null)
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
        const text = await res.text();
        try {
            err = JSON.parse(text);
        } catch (_) {
            err = { message: text };
        }
        throw { status: res.status, ...err };
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

/**
 * Lấy lịch sử mua hàng của user hiện tại.
 * Yêu cầu đã đăng nhập (Bearer token).
 */
export async function getMyInvoices() {
    return request("/api/my/invoices", { method: "GET" });
}
