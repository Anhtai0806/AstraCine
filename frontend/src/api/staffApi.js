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

async function request(path, options = {}) {
    const token = getBearerToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: "include",
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

export const staffApi = {
    createCounterBooking: (payload) =>
        request("/api/staff/counter-bookings", {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    lookupTicket: (code) =>
        request(`/api/staff/tickets/lookup?code=${encodeURIComponent(code)}`, {
            method: "GET",
        }),

    checkInTicket: (code) =>
        request(`/api/staff/tickets/check-in?code=${encodeURIComponent(code)}`, {
            method: "POST",
        }),
    createComboSale: (payload) =>
        request("/api/staff/combo-sales", {
            method: "POST",
            body: JSON.stringify(payload),
        }),
};
