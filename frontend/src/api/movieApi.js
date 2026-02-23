import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/public/movies";

const movieApi = {
    getNowShowing: async () => {
        const response = await axios.get(`${API_BASE_URL}/now-showing`);
        return response.data;
    },

    getComingSoon: async () => {
        const response = await axios.get(`${API_BASE_URL}/coming-soon`);
        return response.data;
    },

    getMovieById: async (id) => {
        const response = await axios.get(`${API_BASE_URL}/${id}`);
        return response.data;
    },

    getAllGenres: async () => {
        const response = await axios.get(`${API_BASE_URL}/genres`);
        return response.data;
    },

    searchMovies: async (params) => {
        const response = await axios.get(`${API_BASE_URL}/search`, { params });
        return response.data;
    },
};

export default movieApi;
