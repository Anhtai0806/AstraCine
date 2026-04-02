import axiosClient from "../services/axiosClient";

const ADMIN_BASE = "/admin/payroll";
const STAFF_BASE = "/staff/payroll";

export const adminPayrollApi = {
  getSummary: (fromDate, toDate) =>
    axiosClient.get(`${ADMIN_BASE}/summary`, { params: { fromDate, toDate } }),
  getStaffDetail: (staffId, fromDate, toDate) =>
    axiosClient.get(`${ADMIN_BASE}/staff/${staffId}`, { params: { fromDate, toDate } }),
};

export const staffPayrollApi = {
  getMyPayroll: (fromDate, toDate) =>
    axiosClient.get(`${STAFF_BASE}/my`, { params: { fromDate, toDate } }),
};
