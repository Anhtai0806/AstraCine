import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Genre APIs
export const genreAPI = {
    getAll: () => api.get('/admin/genres'),
    getById: (id) => api.get(`/admin/genres/${id}`),
    create: (data) => api.post('/admin/genres', data),
    update: (id, data) => api.put(`/admin/genres/${id}`, data),
    delete: (id) => api.delete(`/admin/genres/${id}`),
};

// Movie APIs
export const movieAPI = {
    getAll: (status) => {
        const params = {};
        if (status) {
            params.status = status;
        }
        return api.get('/admin/movies', { params });
    },
    getById: (id) => api.get(`/admin/movies/${id}`),
    search: (title) => api.get('/admin/movies/search', { params: { title } }),
    getByGenre: (genreId) => api.get(`/admin/movies/genre/${genreId}`),
    create: (formData) => api.post('/admin/movies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id, formData) => api.put(`/admin/movies/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id) => api.delete(`/admin/movies/${id}`),
};

export default api;
