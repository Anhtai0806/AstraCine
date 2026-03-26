import axios from "axios";

const adminApi = axios.create({
    baseURL: "http://localhost:8080/api/admin",
    headers: {
        "Content-Type": "application/json",
    },
});

// Add request interceptor to include JWT token
adminApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Separate instance for /api/combos (not under /api/admin)
const comboApi = axios.create({
    baseURL: "http://localhost:8080/api/combos",
    headers: { "Content-Type": "application/json" },
});

comboApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Genre APIs
export const genreAPI = {
    getAll: () => adminApi.get('/genres'),
    getById: (id) => adminApi.get(`/genres/${id}`),
    create: (data) => adminApi.post('/genres', data),
    update: (id, data) => adminApi.put(`/genres/${id}`, data),
    delete: (id) => adminApi.delete(`/genres/${id}`),
};

// Movie APIs
export const movieAPI = {
    getAll: (status) => {
        const params = {};
        if (status) {
            params.status = status;
        }
        return adminApi.get('/movies', { params });
    },
    getById: (id) => adminApi.get(`/movies/${id}`),
    search: (title) => adminApi.get('/movies/search', { params: { title } }),
    getByGenre: (genreId) => adminApi.get(`/movies/genre/${genreId}`),
    create: (formData) => adminApi.post('/movies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id, formData) => adminApi.put(`/movies/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id) => adminApi.delete(`/movies/${id}`),
};

// Promotion APIs
export const promotionAPI = {
    getAll: () => adminApi.get('/promotions'),
    getById: (id) => adminApi.get(`/promotions/${id}`),
    create: (data) => adminApi.post('/promotions', data),
    update: (id, data) => adminApi.put(`/promotions/${id}`, data),
    delete: (id) => adminApi.delete(`/promotions/${id}`),
    validate: (code) => adminApi.get(`/promotions/validate/${code}`),
};

export const staffApplicationAPI = {
    getAll: (keyword) => adminApi.get("/staff-applications", { params: keyword ? { keyword } : {} }),
    handle: (applicationId, payload) => adminApi.put(`/staff-applications/${applicationId}`, payload),
};

export const userManagementAPI = {
    getAll: (keyword) => adminApi.get("/users", { params: keyword ? { keyword } : {} }),
    createAutoStaffAccount: () => adminApi.post("/users/staff-accounts"),
    updateStaffRole: (userId, payload) => adminApi.put(`/users/${userId}/staff-role`, payload),
};

// Combo APIs (bắp nước)
export const comboAPI = {
    getAll: () => comboApi.get(''),
    getById: (id) => comboApi.get(`/${id}`),
    create: (data) => comboApi.post('', data),
    update: (id, data) => comboApi.put(`/${id}`, data),
    delete: (id) => comboApi.delete(`/${id}`),
    search: (params) => comboApi.get('/search', { params }),
};

export default adminApi;
