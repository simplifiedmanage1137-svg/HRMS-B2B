// src/config/api.js

// For Vite (uses import.meta.env)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
    // Auth endpoints
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    TEST: `${API_BASE_URL}/api/test`,
    TEST_DB: `${API_BASE_URL}/api/test-db`,

    // Employee endpoints
    EMPLOYEES: `${API_BASE_URL}/api/employees`,
    EMPLOYEE_BY_ID: (id) => `${API_BASE_URL}/api/employees/${id}`,
    EMPLOYEE_PROFILE: (employeeId) => `${API_BASE_URL}/api/employees/profile/${employeeId}`,
    EMPLOYEE_DOCUMENTS: (employeeId) => `${API_BASE_URL}/api/employees/${employeeId}/documents`,
    EMPLOYEE_DOCUMENT_BY_TYPE: (employeeId, documentType) =>
        `${API_BASE_URL}/api/employees/${employeeId}/documents/${documentType}`,
    EMPLOYEE_DOCUMENT_DELETE: (employeeId, documentType) =>
        `${API_BASE_URL}/api/employees/${employeeId}/documents/${documentType}`,
    EMPLOYEE_DELETE: (id) => `${API_BASE_URL}/api/employees/${id}`,
    TODAY_EVENTS: `${API_BASE_URL}/api/employees/today-events`,

    // Leave endpoints
    LEAVES: `${API_BASE_URL}/api/leaves`,
    LEAVE_APPLY: `${API_BASE_URL}/api/leaves/apply`,
    LEAVE_BY_ID: (id) => `${API_BASE_URL}/api/leaves/${id}`,
    LEAVE_BALANCE: (employeeId) => `${API_BASE_URL}/api/leaves/balance/${employeeId}`,
    LEAVE_BALANCE_BY_YEAR: (employeeId, year) => `${API_BASE_URL}/api/leaves/balance/${employeeId}/${year}`,
    LEAVE_STATUS: (id) => `${API_BASE_URL}/api/leaves/${id}/status`,
    LEAVE_BY_EMPLOYEE: (employeeId) => `${API_BASE_URL}/api/leaves?employee_id=${employeeId}`,

    // Attendance endpoints
    ATTENDANCE_REPORT: `${API_BASE_URL}/api/attendance/report`,
    ATTENDANCE_TODAY: (employee_id) => `${API_BASE_URL}/api/attendance/today/${employee_id}`,
    ATTENDANCE_CLOCK_IN: `${API_BASE_URL}/api/attendance/clock-in`,
    ATTENDANCE_CLOCK_OUT: `${API_BASE_URL}/api/attendance/clock-out`,
    ATTENDANCE_HEARTBEAT: `${API_BASE_URL}/api/attendance/heartbeat`,

    // Notification endpoints
    NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
    NOTIFICATION_READ: (id) => `${API_BASE_URL}/api/notifications/${id}/read`,
    NOTIFICATION_DELETE: (id) => `${API_BASE_URL}/api/notifications/${id}`,
    NOTIFICATIONS_BY_EMPLOYEE: (employeeId) => `${API_BASE_URL}/api/notifications?employee_id=${employeeId}`,

    // Salary endpoints
    SALARY_EMPLOYEE: (employeeId) => `${API_BASE_URL}/api/salary/employee/${employeeId}`,
    SALARY_GENERATE: `${API_BASE_URL}/api/salary/generate`,

    // Shift endpoints
    SHIFTS: `${API_BASE_URL}/api/shifts`,

    // Admin update endpoints
    ADMIN_UPDATES: `${API_BASE_URL}/api/admin-updates`,
    ADMIN_UPDATES_EMPLOYEES: `${API_BASE_URL}/api/admin-updates/employees`,
    ADMIN_UPDATES_SEND_REQUEST: `${API_BASE_URL}/api/admin-updates/send-request`,
    ADMIN_UPDATES_COMPLETED: `${API_BASE_URL}/api/admin-updates/completed-requests`, // ✅ FIXED: API_BTA_URL → API_BASE_URL
    ADMIN_UPDATES_HANDLE: `${API_BASE_URL}/api/admin-updates/handle-request`,
    ADMIN_UPDATES_PENDING_COUNT: `${API_BASE_URL}/api/admin-updates/pending-count`,
    ADMIN_UPDATES_MARK_READ: `${API_BASE_URL}/api/admin-updates/mark-notifications-read`,
    ADMIN_UPDATES_EMPLOYEE_REQUESTS: (employeeId) => `${API_BASE_URL}/api/admin-updates/employee-requests/${employeeId}`,
    ADMIN_UPDATES_SUBMIT: `${API_BASE_URL}/api/admin-updates/submit-update`,

    // Employee update endpoints
    EMPLOYEE_UPDATES: `${API_BASE_URL}/api/employee-updates`,
    EMPLOYEE_UPDATES_PENDING: `${API_BASE_URL}/api/employee-updates/pending-requests`,
    EMPLOYEE_UPDATES_ACCEPT: (requestId) => `${API_BASE_URL}/api/employee-updates/accept-request/${requestId}`,
    EMPLOYEE_UPDATES_CURRENT_DATA: `${API_BASE_URL}/api/employee-updates/current-data`,
    EMPLOYEE_UPDATES_SUBMIT: `${API_BASE_URL}/api/employee-updates/submit-update`,
    EMPLOYEE_UPDATES_COMPLETED: `${API_BASE_URL}/api/employee-updates/completed-requests`,
    EMPLOYEE_UPDATES_REQUEST: (requestId) => `${API_BASE_URL}/api/employee-updates/request/${requestId}`,

    // Update response endpoints
    UPDATE_RESPONSES: `${API_BASE_URL}/api/update-responses`,

    // Geofence endpoints
    GEOFENCE_LIST: `${API_BASE_URL}/api/geofence/list`,
    GEOFENCE_CREATE: `${API_BASE_URL}/api/geofence`,
    GEOFENCE_UPDATE: (id) => `${API_BASE_URL}/api/geofence/${id}`,
    GEOFENCE_DELETE: (id) => `${API_BASE_URL}/api/geofence/${id}`,
    GEOFENCE_GET: (id) => `${API_BASE_URL}/api/geofence/${id}`
};

export default API_ENDPOINTS;