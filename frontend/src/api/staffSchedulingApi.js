import axiosClient from "../services/axiosClient";

const BASE_ADMIN = "/admin/staff-scheduling";
const BASE_STAFF = "/staff/schedule";

export const staffSchedulingAdminApi = {
    generateDemand: (payload) => axiosClient.post(`${BASE_ADMIN}/demands/generate`, payload),
    getDemands: (businessDate) => axiosClient.get(`${BASE_ADMIN}/demands`, { params: { businessDate } }),
    generatePlan: (payload) => axiosClient.post(`${BASE_ADMIN}/plans/generate`, payload),
    generateSimplePlan: (payload) => axiosClient.post(`${BASE_ADMIN}/plans/generate-simple`, payload),
    getPlans: (businessDate) => axiosClient.get(`${BASE_ADMIN}/plans`, { params: { businessDate } }),
    publishPlan: (planId) => axiosClient.post(`${BASE_ADMIN}/plans/${planId}/publish`),
    getAssignments: (businessDate) => axiosClient.get(`${BASE_ADMIN}/assignments`, { params: { businessDate } }),
    getAssignmentExplanation: (assignmentId) => axiosClient.get(`${BASE_ADMIN}/assignments/${assignmentId}/explanation`),
};

export const staffSchedulingStaffApi = {
    getMySchedule: (fromDate, toDate) => axiosClient.get(BASE_STAFF, { params: { fromDate, toDate } }),
    confirmAssignment: (assignmentId) => axiosClient.post(`${BASE_STAFF}/${assignmentId}/confirm`),
};
