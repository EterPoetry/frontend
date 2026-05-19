import type { NotificationItem } from '@/modules/notifications/interfaces/notification-item.interface';

export interface NotificationsListResponse {
    items: NotificationItem[];
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
    unreadCount: number;
    unseenCount: number;
}
