import { watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';
import { usePostsStore } from '@/modules/posts/posts.store';
import {
    readBrowserPushEnabledPreference,
    registerServiceWorker,
} from '@/modules/notifications/utils/browser-push.utils';

export const useBrowserPushRuntime = (): void => {
    const authStore = useAuthStore();
    const notificationsStore = useNotificationsStore();
    const postsStore = usePostsStore();
    let initializedUserId: number | null = null;
    let syncRequestId = 0;

    void registerServiceWorker();

    const getWebPushPublicKey = async (): Promise<string | null> => {
        if (postsStore.config?.notifications?.webPushPublicKey) {
            return postsStore.config.notifications.webPushPublicKey;
        }

        try {
            const config = await postsStore.getConfig();

            return config.notifications?.webPushPublicKey ?? null;
        } catch (_error) {
            return null;
        }
    };

    watch(
        [() => authStore.isInitialized, () => authStore.user?.userId ?? null],
        ([isInitialized, userId]) => {
            if (!isInitialized) {
                return;
            }

            if (initializedUserId === userId) {
                return;
            }

            const previousUserId = initializedUserId;
            initializedUserId = userId ?? null;
            syncRequestId += 1;
            const requestId = syncRequestId;

            if (!userId) {
                return;
            }

            const isDirectUserSwitch = previousUserId !== null && previousUserId !== userId;

            if (!readBrowserPushEnabledPreference(userId)) {
                if (isDirectUserSwitch) {
                    void notificationsStore.removeCurrentBrowserPushSubscription().catch(() => false);
                }

                return;
            }

            void (async () => {
                if (isDirectUserSwitch) {
                    await notificationsStore.removeCurrentBrowserPushSubscription().catch(() => false);
                }

                if (requestId !== syncRequestId) {
                    return;
                }

                const vapidKey = await getWebPushPublicKey();

                if (requestId !== syncRequestId) {
                    return;
                }

                if (vapidKey) {
                    await notificationsStore.subscribeAndSyncBrowserPush(vapidKey).catch(() => false);
                } else {
                    await notificationsStore.syncCurrentBrowserPushSubscription().catch(() => false);
                }
            })();
        },
        { immediate: true },
    );
};
