import { defineStore } from 'pinia';
import router from '@/core/router';
import adminApi from '@/modules/admin/admin.api';
import { AdminRole } from '@/modules/admin/enums/admin-role.enum';
import { AdminRouteNames } from '@/modules/admin/enums/admin-route-names.enum';
import type { AdminAccount } from '@/modules/admin/interfaces/admin-account.interface';
import type { AdminAuthResponse } from '@/modules/admin/interfaces/admin-auth-response.interface';
import type { AdminCategoriesListQuery } from '@/modules/admin/interfaces/admin-categories-list-query.interface';
import type { AdminCategory } from '@/modules/admin/interfaces/admin-category.interface';
import type { AdminCategoryPayload } from '@/modules/admin/interfaces/admin-category-payload.interface';
import type { AdminComplaintsListQuery } from '@/modules/admin/interfaces/admin-complaints-list-query.interface';
import type { AdminComplaintItem } from '@/modules/admin/interfaces/admin-complaint-item.interface';
import type { AdminInviteAcceptPayload } from '@/modules/admin/interfaces/admin-invite-accept-payload.interface';
import type { AdminListQuery } from '@/modules/admin/interfaces/admin-list-query.interface';
import type { AdminLoginPayload } from '@/modules/admin/interfaces/admin-login-payload.interface';
import type { AdminProfilePayload } from '@/modules/admin/interfaces/admin-profile-payload.interface';
import type { AdminState } from '@/modules/admin/interfaces/admin-state.interface';
import type { AdminStatsOverview } from '@/modules/admin/interfaces/admin-stats-overview.interface';
import type { AdminTimeseriesQuery } from '@/modules/admin/interfaces/admin-timeseries-query.interface';
import type { AdminTimeseriesResponse } from '@/modules/admin/interfaces/admin-timeseries-response.interface';
import type { AdminUserDetail } from '@/modules/admin/interfaces/admin-user-detail.interface';
import type { AdminUserListItem } from '@/modules/admin/interfaces/admin-user-list-item.interface';
import type { AdminUsersListQuery } from '@/modules/admin/interfaces/admin-users-list-query.interface';
import type { OffsetPaginationResponse } from '@/modules/admin/interfaces/offset-pagination-response.interface';
import {
    clearStoredAdminToken,
    getStoredAdminToken,
    setStoredAdminToken,
} from '@/modules/admin/utils/admin-auth-storage.utils';

const createInitialState = (): AdminState => ({
    token: getStoredAdminToken(),
    admin: null,
    isInitialized: false,
});

export const useAdminStore = defineStore('admin', {
    state: (): AdminState => createInitialState(),

    getters: {
        isAuthenticated: (state): boolean => Boolean(state.token),
        isGlobalAdmin: (state): boolean => state.admin?.role === AdminRole.GLOBAL_ADMIN,
    },

    actions: {
        setSession(payload: AdminAuthResponse): void {
            this.token = payload.accessToken;
            this.admin = payload.admin;
            this.isInitialized = true;
            setStoredAdminToken(payload.accessToken);
        },

        clearSession(): void {
            this.token = null;
            this.admin = null;
            this.isInitialized = true;
            clearStoredAdminToken();
        },

        async login(payload: AdminLoginPayload): Promise<AdminAccount> {
            const response = await adminApi.post<AdminAuthResponse>('/admin/auth/login', payload);
            this.setSession(response.data);
            return response.data.admin;
        },

        async refresh(): Promise<{ accessToken: string }> {
            const response = await adminApi.post<AdminAuthResponse>('/admin/auth/refresh');
            this.setSession(response.data);
            return { accessToken: response.data.accessToken };
        },

        async acceptInvite(token: string, payload: AdminInviteAcceptPayload): Promise<AdminAccount> {
            const response = await adminApi.post<AdminAuthResponse>(`/admin/auth/invite/accept?token=${token}`, payload);
            this.setSession(response.data);
            return response.data.admin;
        },

        async getProfile(): Promise<AdminAccount> {
            const response = await adminApi.get<AdminAccount>('/admin/auth/profile');
            this.admin = response.data;
            this.isInitialized = true;
            return response.data;
        },

        async updateProfile(payload: AdminProfilePayload): Promise<AdminAccount> {
            const response = await adminApi.patch<AdminAccount>('/admin/auth/profile', payload);
            this.admin = response.data;
            return response.data;
        },

        async logout(shouldRedirect = true): Promise<void> {
            try {
                if (this.token) {
                    await adminApi.post<{ ok: boolean }>('/admin/auth/logout');
                }
            } catch (error) {
                console.error('[AdminStore] Logout failed:', error);
            } finally {
                this.clearSession();

                if (shouldRedirect && router.currentRoute.value.meta.isAdminRoute) {
                    await router.push({ name: AdminRouteNames.LOGIN });
                }
            }
        },

        async getAdmins(query: AdminListQuery): Promise<OffsetPaginationResponse<AdminAccount>> {
            const response = await adminApi.get<OffsetPaginationResponse<AdminAccount>>('/admin/admins', {
                params: query,
            });
            return response.data;
        },

        async inviteAdmin(email: string): Promise<boolean> {
            const response = await adminApi.post<{ ok: boolean }>('/admin/admins/invite', { email });
            return response.data.ok;
        },

        async deleteAdmin(adminId: number): Promise<boolean> {
            const response = await adminApi.delete<{ ok: boolean }>(`/admin/admins/${adminId}`);
            return response.data.ok;
        },

        async getUsers(query: AdminUsersListQuery): Promise<OffsetPaginationResponse<AdminUserListItem>> {
            const response = await adminApi.get<OffsetPaginationResponse<AdminUserListItem>>('/admin/users', {
                params: query,
            });
            return response.data;
        },

        async getUser(userId: number): Promise<AdminUserDetail> {
            const response = await adminApi.get<AdminUserDetail>(`/admin/users/${userId}`);
            return response.data;
        },

        async blockUser(userId: number): Promise<boolean> {
            const response = await adminApi.post<{ ok: boolean }>(`/admin/users/${userId}/block`);
            return response.data.ok;
        },

        async unblockUser(userId: number): Promise<boolean> {
            const response = await adminApi.post<{ ok: boolean }>(`/admin/users/${userId}/unblock`);
            return response.data.ok;
        },

        async deleteViolation(userId: number, complaintId: number): Promise<{ ok: boolean; userBlocked: boolean }> {
            const response = await adminApi.delete<{ ok: boolean; userBlocked: boolean }>(
                `/admin/users/${userId}/violations/${complaintId}`,
            );
            return response.data;
        },

        async getCategories(query: AdminCategoriesListQuery): Promise<OffsetPaginationResponse<AdminCategory>> {
            const response = await adminApi.get<OffsetPaginationResponse<AdminCategory>>('/admin/categories', {
                params: query,
            });
            return response.data;
        },

        async createCategory(payload: AdminCategoryPayload): Promise<AdminCategory> {
            const response = await adminApi.post<AdminCategory>('/admin/categories', payload);
            return response.data;
        },

        async updateCategory(categoryId: number, payload: AdminCategoryPayload): Promise<AdminCategory> {
            const response = await adminApi.patch<AdminCategory>(`/admin/categories/${categoryId}`, payload);
            return response.data;
        },

        async deleteCategory(categoryId: number): Promise<boolean> {
            const response = await adminApi.delete<{ ok: boolean }>(`/admin/categories/${categoryId}`);
            return response.data.ok;
        },

        async getComplaints(query: AdminComplaintsListQuery): Promise<OffsetPaginationResponse<AdminComplaintItem>> {
            const response = await adminApi.get<OffsetPaginationResponse<AdminComplaintItem>>('/admin/complaints', {
                params: query,
            });
            return response.data;
        },

        async acceptComplaint(complaintId: number): Promise<AdminComplaintItem> {
            const response = await adminApi.post<AdminComplaintItem>(`/admin/complaints/${complaintId}/accept`);
            return response.data;
        },

        async declineComplaint(complaintId: number): Promise<AdminComplaintItem> {
            const response = await adminApi.post<AdminComplaintItem>(`/admin/complaints/${complaintId}/decline`);
            return response.data;
        },

        async getStatsOverview(): Promise<AdminStatsOverview> {
            const response = await adminApi.get<AdminStatsOverview>('/admin/stats/overview');
            return response.data;
        },

        async getStatsTimeseries(query: AdminTimeseriesQuery): Promise<AdminTimeseriesResponse> {
            const response = await adminApi.get<AdminTimeseriesResponse>('/admin/stats/timeseries', {
                params: query,
            });
            return response.data;
        },
    },
});
