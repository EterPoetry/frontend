import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import router from '@/core/router';
import { useAdminStore } from '@/modules/admin/admin.store';
import { getStoredAdminToken } from '@/modules/admin/utils/admin-auth-storage.utils';
import { isTokenExpired } from '@/shared/utils/jwt.utils';

interface AdminRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const adminApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let pendingAdminRefresh: Promise<{ accessToken: string }> | null = null;

const isAdminAuthPath = (url?: string): boolean => Boolean(
    url?.includes('/admin/auth/login')
    || url?.includes('/admin/auth/refresh')
    || url?.includes('/admin/auth/invite/accept'),
);

adminApi.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = getStoredAdminToken();

    if (token && !isAdminAuthPath(config.url) && isTokenExpired(token)) {
        if (!pendingAdminRefresh) {
            const adminStore = useAdminStore();
            pendingAdminRefresh = adminStore.refresh().finally(() => {
                pendingAdminRefresh = null;
            });
        }

        try {
            await pendingAdminRefresh;
        } catch (error) {
            console.error('[AdminAPI] Token refresh failed:', error);
        }
    }

    const activeToken = getStoredAdminToken();

    if (activeToken && config.headers && !isAdminAuthPath(config.url)) {
        config.headers.Authorization = `Bearer ${activeToken}`;
    }

    return config;
});

adminApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as AdminRequestConfig | undefined;
        const currentRouteMeta = router.currentRoute.value.meta;
        const token = getStoredAdminToken();

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            if (!token || currentRouteMeta.skipAdminRefresh || originalRequest.url?.includes('/admin/auth/refresh')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                const adminStore = useAdminStore();
                const { accessToken } = await adminStore.refresh();

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return adminApi(originalRequest);
            } catch (refreshError) {
                const adminStore = useAdminStore();
                await adminStore.logout();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export default adminApi;
