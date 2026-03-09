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
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": getAuthHeader(),
            "X-User-Id": getGuestId(),
            ...(options.headers || {}),
        },
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

export const showtimeApi = {
    listShowtimes: async () => {
        // Sử dụng endpoint public cho client
        const res = await fetch(`${API_BASE}/api/public/showtimes`);
        if (!res.ok) {
            throw { status: res.status, message: `Failed to fetch showtimes: ${res.statusText}` };
        }
        const text = await res.text();
        return text ? JSON.parse(text) : [];
    },
};
