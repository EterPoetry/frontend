import type { NotificationActor } from '@/modules/notifications/interfaces/notification-actor.interface';
import type { NotificationTargetRoutePayload } from '@/modules/notifications/interfaces/notification-target-route-payload.interface';

export interface NotificationItem {
    notificationId: number;
    notificationType: string;
    eventsCount: number;
    isRead: boolean;
    isSeen: boolean;
    postId: number | null;
    postSlug: string | null;
    postTitle: string | null;
    commentId: number | null;
    postComplaintId: number | null;
    previewText: string | null;
    commentPreviewText: string | null;
    replyPreviewText: string | null;
    targetType: string | null;
    targetLabel: string | null;
    targetRoutePayload: NotificationTargetRoutePayload | null;
    lastEventAt: string;
    createdAt: string;
    readAt: string | null;
    seenAt: string | null;
    lastActor: NotificationActor | null;
}
