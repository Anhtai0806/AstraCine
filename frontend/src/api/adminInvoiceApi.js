import axiosClient from "../services/axiosClient";

/**
 * Admin Invoice API
 * axiosClient baseURL = http://localhost:8080/api
 * → full URL sẽ là http://localhost:8080/api/admin/invoices
 */

/**
 * Lấy danh sách tất cả hóa đơn (Admin).
 * @param {Object} params - { search, status, from, to }
 *   - search : tìm theo tên khách (string)
 *   - status : 'PAID' | 'CANCELLED' | ''
 *   - from   : 'YYYY-MM-DD' | null
 *   - to     : 'YYYY-MM-DD' | null
 */
export async function getAdminInvoices(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append("search", params.search);
    if (params.status) query.append("status", params.status);
    if (params.from)   query.append("from", params.from);
    if (params.to)     query.append("to", params.to);

    const qs = query.toString();
    const url = `/admin/invoices${qs ? `?${qs}` : ""}`;
    const res = await axiosClient.get(url);
    return res.data;
}

