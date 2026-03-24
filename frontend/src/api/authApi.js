import axios from "axios";

const API_URL = "http://localhost:8080/api/auth";

export const loginApi = (data) => axios.post(`${API_URL}/login`, data);

export const registerApi = (data) => axios.post(`${API_URL}/register`, data);

export const forgotPasswordApi = (email) => axios.post(`${API_URL}/forgot-password`, { email });

export const resetPasswordApi = (token, newPassword) =>
    axios.post(`${API_URL}/reset-password`, { token, newPassword });
