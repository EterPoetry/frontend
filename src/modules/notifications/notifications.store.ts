import { defineStore } from 'pinia';
import api from '@/core/api';
import type { NotificationsListQuery } from '@/modules/notifications/interfaces/notifications-list-query.interface';
import type { NotificationsListResponse } from '@/modules/notifications/interfaces/notifications-list-response.interface';
import type { NotificationsState } from '@/modules/notifications/interfaces/notifications-state.interface';
import type { BrowserPushSubscriptionPayload } from '@/modules/notifications/interfaces/browser-push-subscription-payload.interface';
import type { BrowserPushSettings } from '@/modules/notifications/interfaces/browser-push-settings.interface';
import type { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import type { SeenResponse } from '@/modules/notifications/interfaces/seen-response.interface';
import {
    getCurrentBrowserPushSubscriptionPayload,
    subscribeToPush,
    toBrowserPushSubscriptionPayload,
} from '@/modules/notifications/utils/browser-push.utils';

const createInitialState = (): NotificationsState => ({
    items: [],
    nextCursor: null,
    hasMore: false,
    unreadCount: 0,
    unseenCount: 0,
    isLoaded: false,
});

export const useNotificationsStore = defineStore('notifications', {
    state: (): NotificationsState => createInitialState(),

    getters: {
        hasUnseenNotifications(state): boolean {
            return state.unseenCount > 0;
        },
    },

    actions: {
        resetState(): void {
            Object.assign(this, createInitialState());
        },

        async getNotifications(query: NotificationsListQuery = {}): Promise<NotificationsListResponse> {
            const response = await api.get<NotificationsListResponse>('/notifications', {
                params: query,
            });
            const nextItems = response.data.items;

            this.items = query.cursor
                ? [...this.items, ...nextItems]
                : nextItems;
            this.nextCursor = response.data.nextCursor;
            this.hasMore = response.data.hasMore;
            this.unreadCount = response.data.unreadCount;
            this.unseenCount = response.data.unseenCount;
            this.isLoaded = true;

            return {
                ...response.data,
                items: this.items,
            };
        },

        async getNotificationsSummary(): Promise<number> {
            const response = await api.get<NotificationsListResponse>('/notifications', {
                params: {
                    limit: 1,
                },
            });

            this.unreadCount = response.data.unreadCount;
            this.unseenCount = response.data.unseenCount;
            this.isLoaded = true;

            return this.unseenCount;
        },

        async markNotificationsSeen(): Promise<void> {
            const response = await api.patch<SeenResponse>('/notifications/seen');

            this.unseenCount = response.data.unseenCount;

            const seenAt = new Date().toISOString();

            this.items = this.items.map((item) => item.isSeen
                ? item
                : {
                    ...item,
                    isSeen: true,
                    seenAt,
                });
        },

        async markNotificationSeen(notificationId: number): Promise<void> {
            const response = await api.patch<SeenResponse>(`/notifications/${notificationId}/seen`);

            this.unseenCount = response.data.unseenCount;

            const seenAt = new Date().toISOString();

            this.items = this.items.map((item) => item.notificationId === notificationId && !item.isSeen
                ? {
                    ...item,
                    isSeen: true,
                    seenAt,
                }
                : item);
        },

        async markNotificationAsRead(notificationId: number): Promise<boolean> {
            const response = await api.patch<{ ok: boolean }>(`/notifications/${notificationId}/read`);

            if (!response.data.ok) {
                return false;
            }

            const targetNotification = this.items.find((item) => item.notificationId === notificationId);

            if (!targetNotification || targetNotification.isRead) {
                return true;
            }

            const readAt = new Date().toISOString();

            this.items = this.items.map((item) => item.notificationId === notificationId
                ? {
                    ...item,
                    isRead: true,
                    isSeen: true,
                    readAt,
                    seenAt: item.seenAt ?? readAt,
                }
                : item);
            this.unreadCount = Math.max(0, this.unreadCount - 1);

            return true;
        },

        async markAllNotificationsAsRead(): Promise<boolean> {
            const response = await api.patch<{ ok: boolean }>('/notifications/read-all');

            if (!response.data.ok) {
                return false;
            }

            const readAt = new Date().toISOString();

            this.items = this.items.map((item) => item.isRead
                ? item
                : {
                    ...item,
                    isRead: true,
                    isSeen: true,
                    readAt,
                    seenAt: item.seenAt ?? readAt,
                });
            this.unreadCount = 0;
            this.unseenCount = 0;

            return true;
        },

        async upsertBrowserPushSubscription(payload: BrowserPushSubscriptionPayload): Promise<boolean> {
            const response = await api.patch<{ ok: boolean }>('/notifications/browser-push/subscriptions', payload);

            return response.data.ok;
        },

        async deleteBrowserPushSubscription(payload: BrowserPushSubscriptionPayload): Promise<boolean> {
            const response = await api.patch<{ ok: boolean }>('/notifications/browser-push/subscriptions/delete', payload);

            return response.data.ok;
        },

        async syncCurrentBrowserPushSubscription(): Promise<boolean> {
            const payload = await getCurrentBrowserPushSubscriptionPayload();

            if (!payload) {
                return false;
            }

            return this.upsertBrowserPushSubscription(payload);
        },

        async subscribeAndSyncBrowserPush(vapidPublicKey: string): Promise<boolean> {
            const subscription = await subscribeToPush(vapidPublicKey);
            const payload = toBrowserPushSubscriptionPayload(subscription?.toJSON());

            if (!payload) {
                return false;
            }

            return this.upsertBrowserPushSubscription(payload);
        },

        async removeCurrentBrowserPushSubscription(): Promise<boolean> {
            const payload = await getCurrentBrowserPushSubscriptionPayload();

            if (!payload) {
                return false;
            }

            return this.deleteBrowserPushSubscription(payload);
        },

        async getBrowserPushSettings(): Promise<BrowserPushSettings> {
            const response = await api.get<BrowserPushSettings>('/notifications/push/settings');

            return response.data;
        },

        async updateBrowserPushSettings(disabledTypes: NotificationType[]): Promise<BrowserPushSettings> {
            const response = await api.patch<{ ok: boolean; disabledTypes: NotificationType[] }>(
                '/notifications/push/settings',
                { disabledTypes },
            );

            return { disabledTypes: response.data.disabledTypes };
        },
    },
});
