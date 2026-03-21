import axios from "axios";

const API_URL = "http://localhost:8080/api/user";

const getAuthHeaders = () => {
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const userApi = {
    getProfile: () => {
        return axios.get(`${API_URL}/profile`, {
            headers: getAuthHeaders(),
        });
    },

    updateProfile: (data) => {
        return axios.put(`${API_URL}/profile`, data, {
            headers: getAuthHeaders(),
        });
    },

    changePassword: (data) => {
        return axios.put(`${API_URL}/change-password`, data, {
            headers: getAuthHeaders(),
        });
    },
};
