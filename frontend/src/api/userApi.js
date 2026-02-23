import axios from "axios";

const API_URL = "http://localhost:8080/api/user";

// Lấy userId từ localStorage
const getUserId = () => {
    const userString = localStorage.getItem("user");
    if (userString) {
        const user = JSON.parse(userString);
        return user.userId || user.id;
    }
    return null; // Trả về null nếu không tìm thấy
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
    updateProfile: (data, id) => {
        const userId = id || getUserId();
        return axios.put(`${API_URL}/profile`, data, {
            params: { userId },
        });
    },

    // Thay đổi mật khẩu
    changePassword: (data, id) => {
        const userId = id || getUserId();
        return axios.put(`${API_URL}/change-password`, data, {
            params: { userId },
        });
    },
};
