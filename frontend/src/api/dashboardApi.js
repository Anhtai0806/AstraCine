import axios from 'axios';

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

export const dashboardApi = {
    getStatistics: async (chartType = 'day') => {
        const token = getBearerToken();
        const response = await axios.get(`${API_BASE}/api/v1/admin/dashboard/statistics`, {
            params: { chartType },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    }
};
