import axios from "axios";

// Đổi dòng này thành địa chỉ Backend của bạn (ví dụ localhost:8080)
// Nhớ thêm /api cho khớp với @RequestMapping trong Controller
const API_URL = "http://localhost:8080/api/member"; 

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const memberApi = {
    getProfile: (userId) => {
        return axios.get(`${API_URL}/profile?userId=${userId}`, {
            headers: getAuthHeaders(),
        });
    }
};