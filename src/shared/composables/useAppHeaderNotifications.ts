import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { NOTIFICATIONS_BADGE_MAX, NOTIFICATIONS_PREVIEW_LIMIT } from '@/modules/notifications/constants/notifications.constants';
import { useNotificationsInteraction } from '@/modules/notifications/composables/useNotificationsInteraction';
import { NotificationRouteNames } from '@/modules/notifications/enums/notification-route-names.enum';
import type { NotificationItem } from '@/modules/notifications/interfaces/notification-item.interface';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';
import { isNotificationNavigable } from '@/modules/notifications/utils/notification-formatting.utils';
import { useAuthStore } from '@/modules/auth/auth.store';
import { uk } from '@/shared/locales/uk';

export const useAppHeaderNotifications = () => {
    const authStore = useAuthStore();
    const notificationsStore = useNotificationsStore();
    const router = useRouter();
    const route = useRoute();
    const {
        actionErrorMessage,
        navigationPendingNotificationId,
        openNotification,
    } = useNotificationsInteraction();

    const isDropdownOpen = ref(false);
    const isPreviewLoading = ref(false);
    const previewErrorMessage = ref('');
    const notificationsMenuRef = ref<HTMLElement | null>(null);

    const isNotificationsRoute = computed(() => route.name === NotificationRouteNames.NOTIFICATIONS);
    const previewItems = computed(() => notificationsStore.items.slice(0, NOTIFICATIONS_PREVIEW_LIMIT));
    const badgeCount = computed(() => authStore.isAuthenticated ? notificationsStore.unseenCount : 0);
    const hasUnseenNotifications = computed(() => badgeCount.value > 0);
    const unreadNotificationsCount = computed(() => authStore.isAuthenticated ? notificationsStore.unreadCount : 0);
    const hasUnreadNotifications = computed(() => unreadNotificationsCount.value > 0);
    const notificationsLabel = computed(() => hasUnseenNotifications.value
        ? `${uk.home.notificationsLabel}: ${badgeCount.value}`
        : uk.home.notificationsLabel);
    const unreadSummaryLabel = computed(() => hasUnreadNotifications.value
        ? uk.notifications.unreadSummary(unreadNotificationsCount.value)
        : uk.notifications.seenSummary);

    const closeDropdown = (): void => {
        isDropdownOpen.value = false;
    };

    const handleOutsideClick = (event: MouseEvent): void => {
        if (notificationsMenuRef.value && !notificationsMenuRef.value.contains(event.target as Node)) {
            closeDropdown();
        }
    };

    const handleEscape = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            closeDropdown();
        }
    };

    const loadPreview = async (): Promise<boolean> => {
        if (!authStore.isAuthenticated || isPreviewLoading.value) {
            return false;
        }

        isPreviewLoading.value = true;
        previewErrorMessage.value = '';

        try {
            await notificationsStore.getNotifications({ limit: NOTIFICATIONS_PREVIEW_LIMIT });
            return true;
        } catch (_error) {
            previewErrorMessage.value = uk.notifications.previewLoadFailed;
            return false;
        } finally {
            isPreviewLoading.value = false;
        }
    };

    const toggleDropdown = async (): Promise<void> => {
        if (!authStore.isAuthenticated) {
            await router.push({ name: AuthRouteNames.LOGIN });
            return;
        }

        if (isDropdownOpen.value) {
            closeDropdown();
            return;
        }

        isDropdownOpen.value = true;

        const didLoadPreview = await loadPreview();

        if (didLoadPreview) {
            await notificationsStore.markNotificationsSeen().catch(() => undefined);
        }
    };

    const openNotificationsPage = async (): Promise<void> => {
        closeDropdown();

        if (isNotificationsRoute.value) {
            return;
        }

        await router.push({ name: NotificationRouteNames.NOTIFICATIONS });
    };

    const openPreviewNotification = async (item: NotificationItem): Promise<void> => {
        await openNotification(item);
        closeDropdown();
    };

    const isPreviewItemDisabled = (item: NotificationItem): boolean => (
        navigationPendingNotificationId.value === item.notificationId || (!isNotificationNavigable(item) && item.isRead)
    );

    watch(
        () => authStore.isAuthenticated,
        (isAuthenticated) => {
            if (!isAuthenticated) {
                closeDropdown();
                notificationsStore.resetState();
            }
        },
    );

    watch(
        () => route.fullPath,
        () => {
            closeDropdown();
        },
    );

    watch(isDropdownOpen, (isOpen) => {
        if (isOpen) {
            document.addEventListener('click', handleOutsideClick);
            document.addEventListener('keydown', handleEscape);
            return;
        }

        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscape);
    });

    onMounted(() => {
        if (!authStore.isAuthenticated) {
            return;
        }

        void notificationsStore.getNotificationsSummary().catch(() => undefined);
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscape);
    });

    return {
        actionErrorMessage,
        badgeCount,
        badgeMax: NOTIFICATIONS_BADGE_MAX,
        closeDropdown,
        hasUnreadNotifications,
        hasUnseenNotifications,
        isDropdownOpen,
        isNotificationsRoute,
        isPreviewItemDisabled,
        isPreviewLoading,
        navigationPendingNotificationId,
        notificationsLabel,
        notificationsMenuRef,
        openNotificationsPage,
        openPreviewNotification,
        previewErrorMessage,
        previewItems,
        toggleDropdown,
        unreadSummaryLabel,
    };
};
