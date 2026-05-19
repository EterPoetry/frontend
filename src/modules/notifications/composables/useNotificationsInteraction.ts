import { isAxiosError } from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import type { NotificationItem } from '@/modules/notifications/interfaces/notification-item.interface';
import { isNotificationNavigable } from '@/modules/notifications/utils/notification-formatting.utils';
import { COMMENTS_FOCUS_EVENT, COMMENTS_FOCUS_QUERY_TARGET } from '@/modules/posts/constants/post-comments.constants';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { usePostsStore } from '@/modules/posts/posts.store';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import { uk } from '@/shared/locales/uk';

export const useNotificationsInteraction = () => {
    const notificationsStore = useNotificationsStore();
    const postsStore = usePostsStore();
    const router = useRouter();

    const actionErrorMessage = ref('');
    const navigationPendingNotificationId = ref<number | null>(null);

    const navigateToNotificationTarget = async (item: NotificationItem): Promise<void> => {
        const followActor = item.targetRoutePayload?.username ?? item.lastActor?.username;

        if (item.notificationType === NotificationType.USER_FOLLOWED && followActor) {
            await router.push({
                name: ProfileRouteNames.PROFILE_BY_USERNAME,
                params: { username: followActor },
            });
            return;
        }

        const postSlug = item.targetRoutePayload?.postSlug ?? item.postSlug;
        const commentId = item.targetRoutePayload?.commentId ?? item.commentId;
        const postId = item.targetRoutePayload?.postId ?? item.postId;

        if (postId === null) {
            const profileUsername = item.targetRoutePayload?.username ?? item.lastActor?.username;

            if (profileUsername) {
                await router.push({
                    name: ProfileRouteNames.PROFILE_BY_USERNAME,
                    params: { username: profileUsername },
                });
            }
            return;
        }

        const slug = postSlug ?? (await postsStore.fetchPost(postId)).slug;

        if (commentId !== null) {
            window.dispatchEvent(new CustomEvent(COMMENTS_FOCUS_EVENT, {
                detail: { postId },
            }));

            await router.push({
                name: PostRouteNames.POST,
                params: { slug },
                query: {
                    focus: COMMENTS_FOCUS_QUERY_TARGET,
                    focusToken: Date.now().toString(),
                },
                hash: '#comments',
            });
            return;
        }

        await router.push({
            name: PostRouteNames.POST,
            params: { slug },
        });
    };

    const openNotification = async (item: NotificationItem): Promise<void> => {
        if (navigationPendingNotificationId.value !== null) {
            return;
        }

        navigationPendingNotificationId.value = item.notificationId;
        actionErrorMessage.value = '';

        try {
            if (!item.isRead) {
                try {
                    await notificationsStore.markNotificationAsRead(item.notificationId);
                } catch (error) {
                    if (!isAxiosError(error) || error.response?.status !== 404) {
                        throw error;
                    }
                }
            }

            if (!isNotificationNavigable(item)) {
                return;
            }

            await navigateToNotificationTarget(item);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 404) {
                actionErrorMessage.value = uk.notifications.targetUnavailable;
            } else {
                actionErrorMessage.value = uk.common.errors.serverError;
            }
        } finally {
            navigationPendingNotificationId.value = null;
        }
    };

    return {
        actionErrorMessage,
        navigationPendingNotificationId,
        openNotification,
    };
};
