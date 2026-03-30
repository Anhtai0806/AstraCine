import axiosClient from './axiosClient';

const ENDPOINT = '/admin/rooms';

export const roomService = {
    // Lấy tất cả phòng (Admin — bao gồm INACTIVE)
    getAll: () => axiosClient.get(ENDPOINT),

    // Lấy chỉ phòng ACTIVE (dùng cho dropdown Showtime)
    getActive: () => axiosClient.get(`${ENDPOINT}/active`),

    // Tạo phòng (Backend tự sinh ghế)
    create: (data) => axiosClient.post(ENDPOINT, data),

    // Cập nhật phòng (chỉ name + screenType)
    update: (roomId, data) => axiosClient.put(`${ENDPOINT}/${roomId}`, data),

    // Ngưng hoạt động (Soft Delete)
    deactivate: (roomId) => axiosClient.patch(`${ENDPOINT}/${roomId}/deactivate`),

    // Kích hoạt lại
    activate: (roomId) => axiosClient.patch(`${ENDPOINT}/${roomId}/activate`),

    // Xóa vĩnh viễn (Hard Delete)
    hardDelete: (roomId) => axiosClient.delete(`${ENDPOINT}/${roomId}`),

    // Lấy ghế của 1 phòng
    getSeats: (roomId) => axiosClient.get(`${ENDPOINT}/${roomId}/seats`),

    // Update loại ghế (Admin click đổi màu)
    updateSeatType: (seatId, newType) =>
        axiosClient.put(`/seats/${seatId}/type`, null, {
            params: { type: newType }
        }),
};