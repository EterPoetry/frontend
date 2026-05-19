import { defineStore } from 'pinia';
import api from '@/core/api';
import router from '@/core/router';
import { AuthResponse } from '@/modules/auth/interfaces/auth-response.interface';
import { UpdateProfilePayload } from '@/modules/profile/interfaces/update-profile-payload.interface';
import { AuthState } from '@/modules/auth/interfaces/auth-state.interface';
import { AuthData } from '@/modules/auth/interfaces/auth-data.interface';
import { User } from '@/modules/auth/interfaces/user.interface';
import { usePaymentsStore } from '@/modules/payments/payments.store';
import { isTokenExpired } from '@/shared/utils/jwt.utils';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        token: localStorage.getItem('token'),
        user: null,
        isInitialized: false,
    }),

    getters: {
        isAuthenticated: (state): boolean => !!state.token,
        isPremium: (): boolean => usePaymentsStore().isPremium,
        isVerified: (state): boolean => state.user?.isEmailVerified ?? false,
        isTokenExpired: (state): boolean => isTokenExpired(state.token)
    },

    actions: {
        async getProfile(): Promise<User | null> {
            try {
                const response = await api.get<User>('/profile/me');
                this.user = response.data;
                return this.user;
            } catch (error) {
                this.user = null;
                throw error;
            }
        },

        async updateProfile(payload: UpdateProfilePayload): Promise<User | null> {
            const response = await api.patch<User>('/profile/me', payload);
            this.user = response.data;

            return this.user;
        },

        async uploadAvatar(file: File): Promise<User | null> {
            const formData = new FormData();
            formData.append('avatar', file);
            const response = await api.patch<User>('/profile/me/avatar', formData);
            this.user = response.data;

            return this.user;
        },

        async removeAvatar(): Promise<User | null> {
            const response = await api.delete<User>('/profile/me/avatar');
            this.user = response.data;

            return this.user;
        },

        async login(data: Pick<AuthData, 'email' | 'password'>): Promise<boolean> {
            const response = await api.post<AuthResponse>('/auth/login', data);
            const { user, accessToken } = response.data;

            this.token = accessToken;
            this.user = user;
            localStorage.setItem('token', accessToken);

            return true;
        },

        async register(data: Omit<AuthData, 'passwordConfirm'>): Promise<boolean> {
            const response = await api.post<AuthResponse>('/auth/register', data);
            const { user, accessToken } = response.data;

            this.token = accessToken;
            this.user = user;
            localStorage.setItem('token', accessToken);

            return true;
        },

        async refresh(): Promise<{ accessToken: string }> {
            const response = await api.post<AuthResponse>('/auth/refresh');
            const { accessToken, user } = response.data;

            this.token = accessToken;
            this.user = this.user ? { ...this.user, ...user } : user;
            localStorage.setItem('token', accessToken);

            return { accessToken };
        },

        async getVerificationStatus(): Promise<{ remainingMs: number | null }> {
            const response = await api.get<{ remainingMs: number | null }>('/auth/email/verify/request');
            return response.data;
        },

        async requestVerificationEmail(): Promise<boolean> {
            const response = await api.post<{ ok: boolean }>('/auth/email/verify/request');
            return response.data.ok;
        },

        loginWithGoogle(): void {
            const backendUrl = import.meta.env.VITE_API_URL;
            window.location.href = `${backendUrl}/auth/google`;
        },

        async logout(): Promise<void> {
            try {
                if (this.token) await api.post('/auth/logout');
            } catch (error) {
                console.error(error);
            } finally {
                this.token = null;
                this.user = null;
                this.isInitialized = true;
                localStorage.removeItem('token');
                await router.push({ name: AuthRouteNames.LOGIN });
            }
        },

        async verifyEmail(code: string): Promise<boolean> {
            const response = await api.post<{ ok: boolean }>('/auth/email/verify', {
                email: this.user?.email,
                code: code
            });

            if (response.data.ok && this.user) {
                this.user.isEmailVerified = true;
            }

            return response.data.ok;
        },

        async forgotPassword(email: string): Promise<boolean> {
            const response = await api.post<{ ok: boolean }>('/auth/password/forgot', { email });
            return response.data.ok;
        },

        async resetPassword(token: string, newPassword: string): Promise<boolean> {
            const response = await api.post<{ ok: boolean }>('/auth/password/reset', {
                token,
                newPassword
            });
            return response.data.ok;
        },
    }
});
