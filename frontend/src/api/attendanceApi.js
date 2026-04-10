import axiosClient from "../services/axiosClient";

const STAFF_BASE = "/staff/attendance";
const ADMIN_BASE = "/admin/attendance";

export const staffAttendanceApi = {
    getMyAttendance: (fromDate, toDate) =>
        axiosClient.get(`${STAFF_BASE}/my`, { params: { fromDate, toDate } }),

    checkIn: (assignmentId, latitude, longitude) =>
        axiosClient.post(`${STAFF_BASE}/check-in`, {
            assignmentId,
            latitude,
            longitude,
        }),

    checkOut: (assignmentId) =>
        axiosClient.post(`${STAFF_BASE}/check-out`, { assignmentId }),
};

export const adminAttendanceApi = {
    getAttendanceByDate: (businessDate) =>
        axiosClient.get(ADMIN_BASE, { params: { businessDate } }),

    adjustAttendance: (attendanceId, payload) =>
        axiosClient.put(`${ADMIN_BASE}/${attendanceId}/adjust`, payload),

    markAbsent: (assignmentId, note) =>
        axiosClient.put(`${ADMIN_BASE}/assignments/${assignmentId}/mark-absent`, {
            note,
        }),

    getStaffAttendanceStatus: (staffUserId) =>
        axiosClient.get(`${ADMIN_BASE}/staff/${staffUserId}`),
};