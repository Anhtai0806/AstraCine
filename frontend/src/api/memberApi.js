import axios from "axios";

// Khai báo đường dẫn gốc của Backend
const BASE_URL = "http://localhost:8080/api"; 

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const memberApi = {
    // 1. API cũ của bạn: Lấy thông tin tổng quan thẻ thành viên
    getProfile: (userId) => {
        return axios.get(`${BASE_URL}/member/profile?userId=${userId}`, {
            headers: getAuthHeaders(),
        });
    },

    // 2. API THÊM MỚI: Lấy danh sách quà tặng trong Ví Voucher
    getCoupons: (userId) => {
        return axios.get(`${BASE_URL}/users/${userId}/coupons`, {
            headers: getAuthHeaders(),
        });
    }
};