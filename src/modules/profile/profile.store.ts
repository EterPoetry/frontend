import { defineStore } from 'pinia';
import api from '@/core/api';
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
