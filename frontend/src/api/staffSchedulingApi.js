import axiosClient from "../services/axiosClient";
const BASE_ADMIN = "/admin/staff-scheduling";
const BASE_STAFF = "/staff/schedule";

export const staffSchedulingAdminApi = {
    generateDemand: (payload) => axiosClient.post(`${BASE_ADMIN}/demands/generate`, payload),
    generateDemandRange: (payload) => axiosClient.post(`${BASE_ADMIN}/demands/generate-range`, payload),
    getDemands: (businessDate) => axiosClient.get(`${BASE_ADMIN}/demands`, { params: { businessDate } }),
    generatePlan: (payload) => axiosClient.post(`${BASE_ADMIN}/plans/generate`, payload),
    generatePlanRange: (payload) => axiosClient.post(`${BASE_ADMIN}/plans/generate-range`, payload),
    getPlans: (businessDate) => axiosClient.get(`${BASE_ADMIN}/plans`, { params: { businessDate } }),
    publishPlan: (planId) => axiosClient.post(`${BASE_ADMIN}/plans/${planId}/publish`),
    getAssignments: (businessDate) => axiosClient.get(`${BASE_ADMIN}/assignments`, { params: { businessDate } }),
    getStaffOptions: (businessDate) => axiosClient.get(`${BASE_ADMIN}/staff-options`, { params: { businessDate } }),
    getShiftTemplates: () => axiosClient.get(`${BASE_ADMIN}/shift-templates`),
    createManualAssignment: (payload) => axiosClient.post(`${BASE_ADMIN}/assignments`, payload),
    updateManualAssignment: (assignmentId, payload) => axiosClient.put(`${BASE_ADMIN}/assignments/${assignmentId}`, payload),
    deleteManualAssignment: (assignmentId) => axiosClient.delete(`${BASE_ADMIN}/assignments/${assignmentId}`),
    getAssignmentExplanation: (assignmentId) => axiosClient.get(`${BASE_ADMIN}/assignments/${assignmentId}/explanation`),
};

export const staffSchedulingStaffApi = {
    getMySchedule: (fromDate, toDate) => axiosClient.get(BASE_STAFF, { params: { fromDate, toDate } }),
    confirmAssignment: (assignmentId) => axiosClient.post(`${BASE_STAFF}/${assignmentId}/confirm`),
    rejectAssignment: (assignmentId, payload) => axiosClient.post(`${BASE_STAFF}/${assignmentId}/reject`, payload),
};
