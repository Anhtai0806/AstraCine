const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
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
 * Lấy tất cả promotions (để lọc ACTIVE phía FE).
 * @returns {Promise<Array>}
 */
export async function getAllPromotions() {
    return request("/api/admin/promotions");
}

/**
 * Validate một mã promotion theo code.
 * Throws nếu không hợp lệ / hết hạn / hết lượt.
 * @param {string} code
 * @returns {Promise<Object>} PromotionDTO
 */
export async function validatePromotion(code) {
    return request(`/api/admin/promotions/validate/${encodeURIComponent(code)}`);
}
