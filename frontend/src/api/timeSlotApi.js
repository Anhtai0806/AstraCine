import axios from "axios";

const http = axios.create({
    baseURL: "http://localhost:8080",
    withCredentials: true,
});

export const timeSlotApi = {
    async list() {
        const res = await http.get("/api/time-slots");
        return res.data || [];
    },
};
