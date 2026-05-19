import type { BrowserPushSubscriptionPayload } from '@/modules/notifications/interfaces/browser-push-subscription-payload.interface';

const BROWSER_PUSH_ENABLED_STORAGE_KEY = 'notifications.browserPushEnabled';
const BROWSER_PUSH_OWNER_STORAGE_KEY = 'notifications.browserPushOwner';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const isBrowserPushSupported = (): boolean => typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;

export const getBrowserPushPermission = (): NotificationPermission | 'unsupported' => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }

    return Notification.permission;
};

export const readBrowserPushEnabledPreference = (userId?: number | null): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    if (window.localStorage.getItem(BROWSER_PUSH_ENABLED_STORAGE_KEY) !== 'true') {
        return false;
    }

    if (userId != null) {
        const owner = window.localStorage.getItem(BROWSER_PUSH_OWNER_STORAGE_KEY);

        if (owner !== String(userId)) {
            return false;
        }
    }

    return true;
};

export const persistBrowserPushEnabledPreference = (isEnabled: boolean, userId?: number | null): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(BROWSER_PUSH_ENABLED_STORAGE_KEY, String(isEnabled));

    if (isEnabled && userId != null) {
        window.localStorage.setItem(BROWSER_PUSH_OWNER_STORAGE_KEY, String(userId));
    } else if (!isEnabled) {
        window.localStorage.removeItem(BROWSER_PUSH_OWNER_STORAGE_KEY);
    }
};

export const toBrowserPushSubscriptionPayload = (
    subscription: PushSubscriptionJSON | null | undefined,
): BrowserPushSubscriptionPayload | null => {
    if (!subscription || !isNonEmptyString(subscription.endpoint)) {
        return null;
    }

    if (!isNonEmptyString(subscription.keys?.p256dh) || !isNonEmptyString(subscription.keys?.auth)) {
        return null;
    }

    return {
        endpoint: subscription.endpoint,
        expirationTime: typeof subscription.expirationTime === 'number' ? subscription.expirationTime : null,
        keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
        },
    };
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }

    return output;
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isBrowserPushSupported()) {
        return null;
    }

    try {
        return await navigator.serviceWorker.register('/sw.js');
    } catch (_error) {
        return null;
    }
};

export const getCurrentBrowserPushSubscription = async (): Promise<PushSubscription | null> => {
    if (!isBrowserPushSupported()) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        return registration.pushManager.getSubscription();
    } catch (_error) {
        return null;
    }
};

export const subscribeToPush = async (vapidPublicKey: string): Promise<PushSubscription | null> => {
    if (!isBrowserPushSupported()) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();

        if (existing) {
            return existing;
        }

        return await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
    } catch (_error) {
        return null;
    }
};

export const getCurrentBrowserPushSubscriptionPayload = async (): Promise<BrowserPushSubscriptionPayload | null> => {
    const subscription = await getCurrentBrowserPushSubscription();

    return toBrowserPushSubscriptionPayload(subscription?.toJSON());
};

export const unsubscribeCurrentBrowserPushSubscription = async (): Promise<boolean> => {
    const subscription = await getCurrentBrowserPushSubscription();

    if (!subscription) {
        return false;
    }

    try {
        return subscription.unsubscribe();
    } catch (_error) {
        return false;
    }
};
