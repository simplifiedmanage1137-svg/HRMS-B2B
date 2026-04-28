// src/config/axios.js
import axios from 'axios';

// Local: empty string → Vite proxy handles /api/* → localhost:5000
// Production: set VITE_API_URL=https://hrms-b2bindemand-backend.onrender.com in Vercel env vars
const API_URL = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
    baseURL: API_URL,  // No /api suffix - each endpoint already has /api in its path
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
});

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('❌ API Error:', error.message);
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;