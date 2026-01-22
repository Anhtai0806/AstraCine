const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

function getAuthHeader() {
  // Dev-friendly default: admin:admin (khớp application.properties)
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

export const seatHoldApi = {
  getSeats: (showtimeId) => request(`/api/showtimes/${showtimeId}/seats`, { method: "GET" }),

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
};
