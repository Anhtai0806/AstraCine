import axiosClient from './axiosClient';

const BASE = '/admin/surcharges';

export const surchargeService = {
    // Weekend
    getWeekend: () => axiosClient.get(`${BASE}/weekend`),
    updateWeekend: (data) => axiosClient.put(`${BASE}/weekend`, data),

    // Holidays
    getHolidays: () => axiosClient.get(`${BASE}/holidays`),
    createHoliday: (data) => axiosClient.post(`${BASE}/holidays`, data),
    updateHoliday: (id, data) => axiosClient.put(`${BASE}/holidays/${id}`, data),
    toggleHoliday: (id) => axiosClient.patch(`${BASE}/holidays/${id}/toggle`),
    deleteHoliday: (id) => axiosClient.delete(`${BASE}/holidays/${id}`),
};
