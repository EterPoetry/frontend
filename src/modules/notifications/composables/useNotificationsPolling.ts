import { onBeforeUnmount, onMounted } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import {
    NOTIFICATIONS_PAGE_LIMIT,
    NOTIFICATIONS_POLL_ERROR_MAX_INTERVAL_MS,
    NOTIFICATIONS_POLL_HIDDEN_INTERVAL_MS,
    NOTIFICATIONS_POLL_VISIBLE_INTERVAL_MS,
} from '@/modules/notifications/constants/notifications.constants';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';

type NotificationsStore = ReturnType<typeof useNotificationsStore>;
type AuthStore = ReturnType<typeof useAuthStore>;

interface UseNotificationsPollingOptions {
    fullFeed?: boolean;
}

let summaryConsumerCount = 0;
let fullFeedConsumerCount = 0;
let pollTimeoutId: number | null = null;
let isPollInFlight = false;
let currentPollIntervalMs = NOTIFICATIONS_POLL_VISIBLE_INTERVAL_MS;
let pollingNotificationsStore: NotificationsStore | null = null;
let pollingAuthStore: AuthStore | null = null;

const hasPollingConsumers = (): boolean => summaryConsumerCount > 0 || fullFeedConsumerCount > 0;

const shouldPollFullFeed = (): boolean => fullFeedConsumerCount > 0;

const getFullFeedPollLimit = (notificationsStore: NotificationsStore): number => Math.min(
    Math.max(NOTIFICATIONS_PAGE_LIMIT, notificationsStore.items.length),
    100,
);

const getBasePollInterval = (): number => document.visibilityState === 'visible'
    ? NOTIFICATIONS_POLL_VISIBLE_INTERVAL_MS
    : NOTIFICATIONS_POLL_HIDDEN_INTERVAL_MS;

const clearPollTimer = (): void => {
    if (pollTimeoutId !== null) {
        window.clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
    }
};

const scheduleNextPoll = (delayMs = currentPollIntervalMs): void => {
    clearPollTimer();

    if (!hasPollingConsumers()) {
        return;
    }

    pollTimeoutId = window.setTimeout(() => {
        void runNotificationsPoll();
    }, delayMs);
};

const runNotificationsPoll = async (): Promise<void> => {
    clearPollTimer();

    if (!hasPollingConsumers()) {
        return;
    }

    if (!pollingAuthStore?.isAuthenticated) {
        pollingNotificationsStore?.resetState();
        currentPollIntervalMs = getBasePollInterval();
        scheduleNextPoll();
        return;
    }

    if (!pollingNotificationsStore || isPollInFlight) {
        scheduleNextPoll(getBasePollInterval());
        return;
    }

    isPollInFlight = true;

    try {
        if (shouldPollFullFeed() && document.visibilityState === 'visible') {
            await pollingNotificationsStore.getNotifications({
                limit: getFullFeedPollLimit(pollingNotificationsStore),
            });
        } else {
            await pollingNotificationsStore.getNotificationsSummary();
        }

        currentPollIntervalMs = getBasePollInterval();
    } catch (_error) {
        currentPollIntervalMs = Math.min(
            Math.max(currentPollIntervalMs, getBasePollInterval()) * 2,
            NOTIFICATIONS_POLL_ERROR_MAX_INTERVAL_MS,
        );
    } finally {
        isPollInFlight = false;
        scheduleNextPoll();
    }
};

const handlePollingWake = (): void => {
    currentPollIntervalMs = getBasePollInterval();

    if (document.visibilityState !== 'visible') {
        scheduleNextPoll();
        return;
    }

    void runNotificationsPoll();
};

const bindPollingListeners = (): void => {
    window.addEventListener('focus', handlePollingWake);
    window.addEventListener('online', handlePollingWake);
    document.addEventListener('visibilitychange', handlePollingWake);
};

const unbindPollingListeners = (): void => {
    window.removeEventListener('focus', handlePollingWake);
    window.removeEventListener('online', handlePollingWake);
    document.removeEventListener('visibilitychange', handlePollingWake);
};

const startPolling = (isFullFeed: boolean, notificationsStore: NotificationsStore, authStore: AuthStore): void => {
    pollingNotificationsStore = notificationsStore;
    pollingAuthStore = authStore;

    if (isFullFeed) {
        fullFeedConsumerCount += 1;
    } else {
        summaryConsumerCount += 1;
    }

    if (summaryConsumerCount + fullFeedConsumerCount === 1) {
        bindPollingListeners();
    }

    currentPollIntervalMs = getBasePollInterval();
    scheduleNextPoll();
};

const stopPolling = (isFullFeed: boolean): void => {
    if (isFullFeed) {
        fullFeedConsumerCount = Math.max(0, fullFeedConsumerCount - 1);
    } else {
        summaryConsumerCount = Math.max(0, summaryConsumerCount - 1);
    }

    if (hasPollingConsumers()) {
        currentPollIntervalMs = getBasePollInterval();
        scheduleNextPoll();
        return;
    }

    clearPollTimer();
    unbindPollingListeners();
    isPollInFlight = false;
    pollingNotificationsStore = null;
    pollingAuthStore = null;
};

export const useNotificationsPolling = (options: UseNotificationsPollingOptions = {}): void => {
    const authStore = useAuthStore();
    const notificationsStore = useNotificationsStore();
    const isFullFeed = options.fullFeed === true;

    onMounted(() => {
        startPolling(isFullFeed, notificationsStore, authStore);
    });

    onBeforeUnmount(() => {
        stopPolling(isFullFeed);
    });
};
