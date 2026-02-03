/**
 * API Service
 * Handles HTTP requests to the backend
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Store access token in memory (more secure than localStorage)
let accessToken = null;

// Set access token
export const setAccessToken = (token) => {
    accessToken = token;
};

// Get access token
export const getAccessToken = () => accessToken;

// Clear access token
export const clearAccessToken = () => {
    accessToken = null;
};

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const response = await api.post('/auth/refresh');
                const { accessToken: newToken } = response.data;
                setAccessToken(newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                clearAccessToken();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    signup: (data) => api.post('/auth/signup', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    refresh: () => api.post('/auth/refresh'),
    getProfile: () => api.get('/auth/profile'),
};

// Room API
export const roomAPI = {
    create: (data) => api.post('/rooms', data),
    getAll: () => api.get('/rooms'),
    getById: (roomId) => api.get(`/rooms/${roomId}`),
    join: (roomId, password) => api.post(`/rooms/${roomId}/join`, { password }),
    leave: (roomId) => api.post(`/rooms/${roomId}/leave`),
    updateSettings: (roomId, settings) => api.patch(`/rooms/${roomId}/settings`, settings),
};

// Game API
export const gameAPI = {
    start: (roomId) => api.post('/games/start', { roomId }),
    getState: (gameId) => api.get(`/games/${gameId}`),
    submitWord: (gameId, word, category) => api.post(`/games/${gameId}/word`, { word, category }),
    getRandomWord: (category) => api.get('/games/random-word', { params: { category } }),
};

// Leaderboard API
export const leaderboardAPI = {
    getGlobal: () => api.get('/leaderboard'),
    getWeekly: () => api.get('/leaderboard/weekly'),
    getMonthly: () => api.get('/leaderboard/monthly'),
    getMyStats: () => api.get('/leaderboard/me'),
};

export default api;
