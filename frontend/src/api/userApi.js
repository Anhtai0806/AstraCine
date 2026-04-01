import axiosClient from "../services/axiosClient";

const API_URL = "/user";



export const userApi = {
    getProfile: () => {
        return axiosClient.get(`${API_URL}/profile`);
    },

    updateProfile: (data) => {
        return axiosClient.put(`${API_URL}/profile`, data);
    },

    changePassword: (data) => {
        return axiosClient.put(`${API_URL}/change-password`, data);
    },
};
