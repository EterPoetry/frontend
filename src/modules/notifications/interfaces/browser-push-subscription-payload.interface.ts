import type { BrowserPushSubscriptionKeys } from '@/modules/notifications/interfaces/browser-push-subscription-keys.interface';

export interface BrowserPushSubscriptionPayload {
    endpoint: string;
    expirationTime: number | null;
    keys: BrowserPushSubscriptionKeys;
}
