import type { NotificationItem } from '@/modules/notifications/interfaces/notification-item.interface';

export interface NotificationsState {
    items: NotificationItem[];
    nextCursor: string | null;
    hasMore: boolean;
    unreadCount: number;
    unseenCount: number;
    isLoaded: boolean;
}
