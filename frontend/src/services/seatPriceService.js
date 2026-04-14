import axiosClient from './axiosClient';

const ENDPOINT = '/admin/seat-prices';

export const seatPriceService = {
    getAll: () => axiosClient.get(ENDPOINT),
    update: (prices) => axiosClient.put(ENDPOINT, prices),
};
