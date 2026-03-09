import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include Basic Auth
api.interceptors.request.use(
    (config) => {
        // Sử dụng JWT Auth
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

// Genre APIs
export const genreAPI = {
    getAll: () => api.get('/api/admin/genres'),
    getById: (id) => api.get(`/api/admin/genres/${id}`),
    create: (data) => api.post('/api/admin/genres', data),
    update: (id, data) => api.put(`/api/admin/genres/${id}`, data),
    delete: (id) => api.delete(`/api/admin/genres/${id}`),
};

// Movie APIs
export const movieAPI = {
    getAll: (status) => {
        const params = {};
        if (status) {
            params.status = status;
        }
        return api.get('/api/admin/movies', { params });
    },
    getById: (id) => api.get(`/api/admin/movies/${id}`),
    search: (title) => api.get('/api/admin/movies/search', { params: { title } }),
    getByGenre: (genreId) => api.get(`/api/admin/movies/genre/${genreId}`),
    create: (formData) => api.post('/api/admin/movies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id, formData) => api.put(`/api/admin/movies/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id) => api.delete(`/api/admin/movies/${id}`),
};
export const comboAPI = {
    getAll: () => api.get('/api/combos'),

    getActive: () => api.get('/api/combos/active'),

    // 3. Tìm kiếm & Lọc (Dùng cho Menu Board)
    search: (keyword, minPrice, maxPrice) => {
        const params = {
            status: 'ACTIVE' // Mặc định Client chỉ tìm những cái đang bán
        };
        if (keyword) params.keyword = keyword;
        if (minPrice !== undefined && minPrice !== null) params.minPrice = minPrice;
        if (maxPrice !== undefined && maxPrice !== null) params.maxPrice = maxPrice;

        return api.get('/api/combos/search', { params });
    },

    getById: (id) => api.get(`/api/combos/${id}`),
    create: (data) => api.post('/api/combos', data),
    update: (id, data) => api.put(`/api/combos/${id}`, data),
    delete: (id) => api.delete(`/api/combos/${id}`),
};
export default api;
