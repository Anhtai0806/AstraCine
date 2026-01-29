import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'http://localhost:8080/api', // Đổi port nếu cần
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosClient.interceptors.request.use(async (config) => {
    // Lấy token từ localStorage (nơi bạn lưu khi Login thành công)
    const token = localStorage.getItem('token'); 
    
    if (token) {
        // Gắn vào header: Authorization: Bearer eyJhbGci...
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Xử lý khi Token hết hạn (Optional)
axiosClient.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        // Nếu bị 401 -> Token sai hoặc hết hạn -> Đá về trang Login
        // window.location.href = '/login';
        console.error("Lỗi 401: Chưa đăng nhập hoặc không có quyền Admin");
    }
    throw error;
});

export default axiosClient;