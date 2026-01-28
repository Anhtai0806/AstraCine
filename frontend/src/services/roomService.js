import axiosClient from './axiosClient';

const ENDPOINT = '/rooms';

export const roomService = {
    // Lấy tất cả phòng
    getAll: () => axiosClient.get(ENDPOINT),

    // Tạo phòng (Backend tự sinh ghế)
    create: (data) => axiosClient.post(ENDPOINT, data),

    // Lấy ghế của 1 phòng
    getSeats: (roomId) => axiosClient.get(`${ENDPOINT}/${roomId}/seats`),

    // Update loại ghế (Admin click đổi màu)
    // Backend cần API: PUT /seats/{id}/type?type=VIP
    updateSeatType: (seatId, newType) => 
        axiosClient.put(`/seats/${seatId}/type`, null, { 
            params: { type: newType } 
        }),
};