import axios from "axios";

const API_URL = "http://localhost:8080/api/auth";

export const loginApi = (data) => {
  return axios.post(`${API_URL}/login`, data);
};

export const registerApi = (data) => {
  return axios.post(`${API_URL}/register`, data);
};

export const submitStaffApplicationApi = (data) => {
    return axios.post(`${API_URL}/staff-applications`, data);
};

export const forgotPasswordApi = (email) => {
  return axios.post(`${API_URL}/forgot-password`, { email });
};

export const resetPasswordApi = (token, newPassword) => {
  return axios.post(`${API_URL}/reset-password`, { token, newPassword });
};
