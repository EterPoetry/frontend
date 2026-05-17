import { defineStore } from 'pinia';
import api from '@/core/api';
import type { ActiveViolationResponse } from '@/modules/profile/interfaces/active-violation-response.interface';
import type { ComplaintReasonItem } from '@/modules/profile/interfaces/complaint-reason-item.interface';
import type { ComplaintResponse } from '@/modules/profile/interfaces/complaint-response.interface';
import type { GetProfileFollowListQuery } from '@/modules/profile/interfaces/get-profile-follow-list-query.interface';
import type { PaginatedProfileFollowListResponse } from '@/modules/profile/interfaces/paginated-profile-follow-list-response.interface';
import { PublicProfile } from '@/modules/profile/interfaces/public-profile.interface';
import { ProfileState } from '@/modules/profile/interfaces/profile-state.interface';

export const useProfileStore = defineStore('profile', {
    state: (): ProfileState => ({
        profilesById: {},
    }),

    getters: {
        getProfileById: (state) => (userId: number): PublicProfile | null => state.profilesById[userId] ?? null,
    },

    actions: {
        async getPublicProfile(userId: number): Promise<PublicProfile> {
            const response = await api.get<PublicProfile>(`/profile/${userId}`);

            this.profilesById = {
                ...this.profilesById,
                [userId]: response.data,
            };

            return response.data;
        },

        async getPublicProfileByUsername(username: string): Promise<PublicProfile> {
            const response = await api.get<PublicProfile>(`/profile/username/${username}`);

            this.profilesById = {
                ...this.profilesById,
                [response.data.userId]: response.data,
            };

            return response.data;
        },

        async followUser(userId: number): Promise<PublicProfile> {
            const response = await api.post<PublicProfile>(`/profile/${userId}/follow`);

            this.profilesById = {
                ...this.profilesById,
                [userId]: response.data,
            };

            return response.data;
        },

        async unfollowUser(userId: number): Promise<PublicProfile> {
            const response = await api.delete<PublicProfile>(`/profile/${userId}/follow`);

            this.profilesById = {
                ...this.profilesById,
                [userId]: response.data,
            };

            return response.data;
        },

        async getProfileFollowers(
            userId: number | 'me' = 'me',
            query: GetProfileFollowListQuery = {},
        ): Promise<PaginatedProfileFollowListResponse> {
            const profilePath = userId === 'me' ? 'me' : String(userId);
            const response = await api.get<PaginatedProfileFollowListResponse>(`/profile/${profilePath}/followers`, {
                params: query,
            });

            return response.data;
        },

        async getProfileFollowing(
            userId: number | 'me' = 'me',
            query: GetProfileFollowListQuery = {},
        ): Promise<PaginatedProfileFollowListResponse> {
            const profilePath = userId === 'me' ? 'me' : String(userId);
            const response = await api.get<PaginatedProfileFollowListResponse>(`/profile/${profilePath}/following`, {
                params: query,
            });

            return response.data;
        },

        async getOwnViolations(): Promise<ActiveViolationResponse[]> {
            const response = await api.get<ActiveViolationResponse[]>('/profile/me/violations');

            return response.data;
        },

        async getComplaintReasons(): Promise<ComplaintReasonItem[]> {
            const response = await api.get<ComplaintReasonItem[]>('/complaints/reasons');

            return response.data;
        },

        async submitComplaint(postId: number, complaintReason: string): Promise<ComplaintResponse> {
            const response = await api.post<ComplaintResponse>(`/complaints/${postId}`, { complaintReason });

            return response.data;
        },

        applyProfileSubscriptionState(
            userId: number,
            isSubscribed: boolean,
            followersCount?: number,
        ): void {
            const currentProfile = this.profilesById[userId];

            if (!currentProfile) {
                return;
            }

            this.profilesById = {
                ...this.profilesById,
                [userId]: {
                    ...currentProfile,
                    isSubscribed,
                    followersCount: followersCount ?? Math.max(0, currentProfile.followersCount + (isSubscribed ? 1 : -1)),
                },
            };
        },
    },
});
