import axios from "axios";

const API_URL = "http://localhost:8080/api/user";

// Lấy userId từ localStorage
const getUserId = () => {
    const user = localStorage.getItem("user");
    if (user) {
        return JSON.parse(user).id;
    }
    return 1; // Mặc định là 1 nếu không có
};

export const userApi = {
    // Lấy thông tin profile
    getProfile: () => {
        const userId = getUserId();
        return axios.get(`${API_URL}/profile`, {
            params: { userId },
        });
    },

    // Cập nhật thông tin profile
    updateProfile: (data) => {
        const userId = getUserId();
        return axios.put(`${API_URL}/profile`, data, {
            params: { userId },
        });
    },

    // Thay đổi mật khẩu
    changePassword: (data) => {
        const userId = getUserId();
        return axios.put(`${API_URL}/change-password`, data, {
            params: { userId },
        });
    },
};
