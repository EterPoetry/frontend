import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';
import { usePostsStore } from '@/modules/posts/posts.store';
import { NOTIFICATIONS_LOAD_MORE_ROOT_MARGIN, NOTIFICATIONS_PAGE_LIMIT } from '@/modules/notifications/constants/notifications.constants';
import { useNotificationsInteraction } from '@/modules/notifications/composables/useNotificationsInteraction';
import type { NotificationFeedFilter } from '@/modules/notifications/interfaces/notification-feed-filter.type';
import {
    getFilterQueryParams,
    getNotificationFilterLabel,
    matchesNotificationFilter,
} from '@/modules/notifications/utils/notification-formatting.utils';
import {
    getBrowserPushPermission,
    isBrowserPushSupported,
    persistBrowserPushEnabledPreference,
    readBrowserPushEnabledPreference,
    unsubscribeCurrentBrowserPushSubscription,
} from '@/modules/notifications/utils/browser-push.utils';
import { uk } from '@/shared/locales/uk';

export const useNotificationsPage = () => {
    const authStore = useAuthStore();
    const notificationsStore = useNotificationsStore();
    const postsStore = usePostsStore();
    const {
        actionErrorMessage,
        navigationPendingNotificationId,
        openNotification,
    } = useNotificationsInteraction();

    const isInitialLoading = ref(false);
    const isLoadingMore = ref(false);
    const isMarkAllReadPending = ref(false);
    const isBrowserPushPending = ref(false);
    const errorMessage = ref('');
    const browserPushErrorMessage = ref('');
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    const activeFilter = ref<NotificationFeedFilter>('all');
    const browserPushPermission = ref<NotificationPermission | 'unsupported'>(getBrowserPushPermission());
    const isBrowserPushEnabled = ref(readBrowserPushEnabledPreference());

    let observer: IntersectionObserver | null = null;
    let requestSequence = 0;

    const items = computed(() => notificationsStore.items);
    const filteredItems = computed(() => items.value.filter((item) => matchesNotificationFilter(item, activeFilter.value)));
    const unreadCount = computed(() => notificationsStore.unreadCount);
    const canLoadMore = computed(() => notificationsStore.hasMore && !!notificationsStore.nextCursor);
    const isBrowserPushAvailable = computed(() => isBrowserPushSupported());
    const browserPushStatusLabel = computed(() => {
        if (!isBrowserPushAvailable.value) {
            return uk.notifications.browserPush.statusUnavailable;
        }

        if (browserPushPermission.value === 'denied') {
            return uk.notifications.browserPush.statusBlocked;
        }

        if (browserPushPermission.value === 'granted' && isBrowserPushEnabled.value) {
            return uk.notifications.browserPush.statusEnabled;
        }

        return uk.notifications.browserPush.statusDisabled;
    });
    const browserPushDescription = computed(() => {
        if (!isBrowserPushAvailable.value) {
            return uk.notifications.browserPush.descriptionUnsupported;
        }

        if (browserPushPermission.value === 'denied') {
            return uk.notifications.browserPush.descriptionBlocked;
        }

        if (browserPushPermission.value === 'granted' && isBrowserPushEnabled.value) {
            return uk.notifications.browserPush.descriptionEnabled;
        }

        return uk.notifications.browserPush.descriptionDisabled;
    });
    const filters = computed<Array<{ value: NotificationFeedFilter; label: string }>>(() => (
        (['all', 'unread', 'comments', 'follows'] as NotificationFeedFilter[]).map((value) => ({
            value,
            label: getNotificationFilterLabel(value),
        }))
    ));

    const syncBrowserPushState = async (): Promise<void> => {
        isBrowserPushEnabled.value = readBrowserPushEnabledPreference();
        browserPushPermission.value = getBrowserPushPermission();
    };

    const loadNotifications = async (reset = false): Promise<void> => {
        const requestId = ++requestSequence;

        if (reset) {
            isInitialLoading.value = true;
            errorMessage.value = '';
        } else {
            if (isInitialLoading.value || isLoadingMore.value || !canLoadMore.value) {
                return;
            }

            isLoadingMore.value = true;
        }

        try {
            await notificationsStore.getNotifications({
                limit: NOTIFICATIONS_PAGE_LIMIT,
                ...getFilterQueryParams(activeFilter.value),
                ...(reset ? {} : { cursor: notificationsStore.nextCursor ?? undefined }),
            });

            if (reset) {
                await notificationsStore.markNotificationsSeen().catch(() => undefined);
            }

            if (requestId !== requestSequence) {
                return;
            }
        } catch (_error) {
            if (requestId !== requestSequence) {
                return;
            }

            errorMessage.value = uk.notifications.loadFailed;
        } finally {
            if (requestId !== requestSequence) {
                return;
            }

            isInitialLoading.value = false;
            isLoadingMore.value = false;
        }
    };

    const retry = async (): Promise<void> => {
        await loadNotifications(true);
    };

    const setFilter = (filter: NotificationFeedFilter): void => {
        if (activeFilter.value === filter) {
            return;
        }

        activeFilter.value = filter;
        void loadNotifications(true);
    };

    const markAllAsRead = async (): Promise<void> => {
        if (isMarkAllReadPending.value || unreadCount.value < 1) {
            return;
        }

        isMarkAllReadPending.value = true;
        actionErrorMessage.value = '';

        try {
            await notificationsStore.markAllNotificationsAsRead();
        } catch (_error) {
            actionErrorMessage.value = uk.common.errors.serverError;
        } finally {
            isMarkAllReadPending.value = false;
        }
    };

    const enableBrowserPush = async (): Promise<void> => {
        if (isBrowserPushPending.value || !isBrowserPushAvailable.value) {
            if (!isBrowserPushAvailable.value) {
                browserPushErrorMessage.value = uk.notifications.browserPush.unsupportedError;
            }

            return;
        }

        isBrowserPushPending.value = true;
        browserPushErrorMessage.value = '';

        try {
            const permission = browserPushPermission.value === 'granted'
                ? 'granted'
                : await Notification.requestPermission();

            browserPushPermission.value = permission;

            if (permission !== 'granted') {
                persistBrowserPushEnabledPreference(false, authStore.user?.userId);
                isBrowserPushEnabled.value = false;
                browserPushErrorMessage.value = permission === 'denied'
                    ? uk.notifications.browserPush.blockedError
                    : uk.notifications.browserPush.permissionRequiredError;
                return;
            }

            persistBrowserPushEnabledPreference(true, authStore.user?.userId);
            isBrowserPushEnabled.value = true;

            const config = postsStore.config ?? await postsStore.getConfig().catch(() => null);
            const vapidKey = config?.notifications?.webPushPublicKey;

            if (vapidKey) {
                await notificationsStore.subscribeAndSyncBrowserPush(vapidKey).catch(() => false);
            } else {
                await notificationsStore.syncCurrentBrowserPushSubscription().catch(() => false);
            }
        } finally {
            isBrowserPushPending.value = false;
        }
    };

    const disableBrowserPush = async (): Promise<void> => {
        if (isBrowserPushPending.value) {
            return;
        }

        isBrowserPushPending.value = true;
        browserPushErrorMessage.value = '';

        try {
            persistBrowserPushEnabledPreference(false, authStore.user?.userId);
            isBrowserPushEnabled.value = false;

            await notificationsStore.removeCurrentBrowserPushSubscription().catch(() => false);
            await unsubscribeCurrentBrowserPushSubscription().catch(() => false);
            await syncBrowserPushState();
        } finally {
            isBrowserPushPending.value = false;
        }
    };

    const setupObserver = (): void => {
        if (observer) {
            observer.disconnect();
        }

        observer = new IntersectionObserver((entries) => {
            const [entry] = entries;

            if (!entry?.isIntersecting) {
                return;
            }

            void loadNotifications(false);
        }, {
            rootMargin: NOTIFICATIONS_LOAD_MORE_ROOT_MARGIN,
        });

        if (loadMoreTrigger.value) {
            observer.observe(loadMoreTrigger.value);
        }
    };

    watch(loadMoreTrigger, () => {
        setupObserver();
    });

    onMounted(() => {
        setupObserver();
        void syncBrowserPushState();
        void loadNotifications(true);
    });

    onBeforeUnmount(() => {
        observer?.disconnect();
    });

    return {
        actionErrorMessage,
        canLoadMore,
        browserPushDescription,
        browserPushErrorMessage,
        browserPushPermission,
        browserPushStatusLabel,
        errorMessage,
        disableBrowserPush,
        enableBrowserPush,
        filteredItems,
        filters,
        isInitialLoading,
        isBrowserPushAvailable,
        isBrowserPushEnabled,
        isBrowserPushPending,
        isLoadingMore,
        isMarkAllReadPending,
        items,
        loadMoreTrigger,
        markAllAsRead,
        activeFilter,
        navigationPendingNotificationId,
        openNotification,
        retry,
        setFilter,
        unreadCount,
    };
};
