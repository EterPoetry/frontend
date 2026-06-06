import { ADMIN_AUTH_TOKEN_STORAGE_KEY } from '@/modules/admin/constants/admin.constants';

export const getStoredAdminToken = (): string | null => localStorage.getItem(ADMIN_AUTH_TOKEN_STORAGE_KEY);

export const setStoredAdminToken = (token: string): void => {
    localStorage.setItem(ADMIN_AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearStoredAdminToken = (): void => {
    localStorage.removeItem(ADMIN_AUTH_TOKEN_STORAGE_KEY);
};
