import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/modules/auth/auth.store';
import router from '@/core/router';

interface CustomRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    const isAuthPath = config.url?.includes('/auth/login')
        || config.url?.includes('/auth/refresh')
        || config.url?.includes('/auth/reset-password');

    if (token && config.headers && !isAuthPath) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomRequestConfig;
        const authStore = useAuthStore();
        const currentRouteMeta = router.currentRoute.value.meta;
        const token = localStorage.getItem('token');

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            if (!token || currentRouteMeta.skipAuthRefresh || originalRequest.url?.includes('/auth/refresh')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            try {
                const { accessToken } = await authStore.refresh();
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                await authStore.logout();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
