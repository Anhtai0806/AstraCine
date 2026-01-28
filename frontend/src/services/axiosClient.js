import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'http://localhost:8080/api', // Đổi port nếu cần
    headers: {
        'Content-Type': 'application/json',
    },
});

// Có thể thêm Interceptors để xử lý Token tự động sau này
// axiosClient.interceptors.request.use(...)

export default axiosClient;