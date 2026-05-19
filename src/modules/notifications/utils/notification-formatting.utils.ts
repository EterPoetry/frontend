import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import type { NotificationFeedFilter } from '@/modules/notifications/interfaces/notification-feed-filter.type';
import type { NotificationItem } from '@/modules/notifications/interfaces/notification-item.interface';
import type { NotificationsListQuery } from '@/modules/notifications/interfaces/notifications-list-query.interface';
import { uk } from '@/shared/locales/uk';

export const formatNotificationTime = (value: string): string => {
    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) {
        return '';
    }

    const diffMs = Math.max(0, Date.now() - timestamp);
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) {
        return uk.posts.details.timeAgoNow;
    }

    if (diffMinutes < 60) {
        return uk.posts.details.timeAgoMinutes(diffMinutes);
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return uk.posts.details.timeAgoHours(diffHours);
    }

    const diffDays = Math.floor(diffHours / 24);

    return uk.posts.details.timeAgoDays(diffDays);
};

export const getNotificationTitle = (notificationType: string): string => {
    if (notificationType === NotificationType.POST_LIKED) {
        return uk.notifications.items.postLiked;
    }

    if (notificationType === NotificationType.POST_COMMENTED) {
        return uk.notifications.items.postCommented;
    }

    if (notificationType === NotificationType.COMMENT_REPLIED) {
        return uk.notifications.items.commentReplied;
    }

    if (notificationType === NotificationType.COMMENT_LIKED) {
        return uk.notifications.items.commentLiked;
    }

    if (notificationType === NotificationType.USER_FOLLOWED) {
        return uk.notifications.items.userFollowed;
    }

    if (notificationType === NotificationType.POST_VIOLATION_CONFIRMED) {
        return uk.notifications.items.postViolationConfirmed;
    }

    return uk.notifications.items.fallback;
};

export const getNotificationFilterLabel = (filter: NotificationFeedFilter): string => {
    if (filter === 'unread') {
        return uk.notifications.filters.unread;
    }

    if (filter === 'comments') {
        return uk.notifications.filters.comments;
    }

    if (filter === 'follows') {
        return uk.notifications.filters.follows;
    }

    if (filter === 'mentions') {
        return uk.notifications.filters.mentions;
    }

    return uk.notifications.filters.all;
};

export const getNotificationActorOverflowLabel = (eventsCount: number): string => {
    const otherActorsCount = Math.max(0, eventsCount - 1);

    if (otherActorsCount < 1) {
        return '';
    }

    return uk.notifications.actors.others(otherActorsCount);
};

export const getNotificationActorSummary = (item: NotificationItem): string => {
    if (item.lastActor) {
        if (item.eventsCount > 1) {
            return uk.notifications.actors.withOthers(item.lastActor.name, item.eventsCount - 1);
        }

        return item.lastActor.name;
    }

    if (item.eventsCount > 1) {
        return uk.notifications.actors.count(item.eventsCount);
    }

    return uk.notifications.actors.system;
};

export const getNotificationRelatedLabel = (item: NotificationItem): string => {
    if (item.targetLabel) {
        return item.targetLabel;
    }

    if (item.postComplaintId !== null) {
        return uk.notifications.related.complaint;
    }

    if (item.commentId !== null) {
        return uk.notifications.related.comment;
    }

    if (item.postId !== null) {
        return uk.notifications.related.post;
    }

    return uk.notifications.related.profile;
};

export const getFilterQueryParams = (filter: NotificationFeedFilter): Pick<NotificationsListQuery, 'status' | 'type'> => {
    if (filter === 'unread') {
        return { status: 'unread' };
    }

    if (filter === 'comments') {
        return { type: 'comments' };
    }

    if (filter === 'follows') {
        return { type: 'follows' };
    }

    if (filter === 'mentions') {
        return { type: 'mentions' };
    }

    if (filter === 'likes') {
        return { type: 'likes' };
    }

    if (filter === 'system') {
        return { type: 'system' };
    }

    return {};
};

export const isNotificationNavigable = (item: NotificationItem): boolean => {
    if (item.notificationType === NotificationType.USER_FOLLOWED) {
        return !!item.lastActor?.username;
    }

    return item.postId !== null || !!item.lastActor?.username;
};

const isMentionNotificationType = (notificationType: string): boolean => notificationType.includes('mention');

export const matchesNotificationFilter = (item: NotificationItem, filter: NotificationFeedFilter): boolean => {
    if (filter === 'all') {
        return true;
    }

    if (filter === 'unread') {
        return !item.isRead;
    }

    if (filter === 'comments') {
        return item.notificationType === NotificationType.POST_COMMENTED
            || item.notificationType === NotificationType.COMMENT_REPLIED
            || item.notificationType === NotificationType.COMMENT_LIKED;
    }

    if (filter === 'follows') {
        return item.notificationType === NotificationType.USER_FOLLOWED;
    }

    if (filter === 'likes') {
        return item.notificationType === NotificationType.POST_LIKED
            || item.notificationType === NotificationType.COMMENT_LIKED;
    }

    if (filter === 'system') {
        return item.notificationType === NotificationType.POST_VIOLATION_CONFIRMED;
    }

    return isMentionNotificationType(item.notificationType);
};

