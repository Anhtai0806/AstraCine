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

function getAuthHeader() {
    const stored = localStorage.getItem("basicAuth");
    if (stored) return stored.startsWith("Basic ") ? stored : `Basic ${stored}`;
    return `Basic ${btoa("admin:admin")}`;
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
        try { err = await res.json(); } catch (_) { err = { message: await res.text() }; }
        throw { status: res.status, ...err };
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

export const showtimeApi = {
    listShowtimes: () => request("/api/showtimes", { method: "GET" }),
};
