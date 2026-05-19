import { computed, ref } from 'vue';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';
import { NotificationType } from '@/modules/notifications/enums/notification-type.enum';
import { getNotificationTitle } from '@/modules/notifications/utils/notification-formatting.utils';
import { uk } from '@/shared/locales/uk';

const ALL_TYPES: NotificationType[] = [
    NotificationType.POST_LIKED,
    NotificationType.POST_COMMENTED,
    NotificationType.COMMENT_REPLIED,
    NotificationType.COMMENT_LIKED,
    NotificationType.USER_FOLLOWED,
    NotificationType.POST_VIOLATION_CONFIRMED,
];

export const useNotificationPushSettingsDialog = (onClose: () => void) => {
    const notificationsStore = useNotificationsStore();

    const isLoading = ref(false);
    const isSaving = ref(false);
    const errorMessage = ref('');
    const disabledTypes = ref<Set<NotificationType>>(new Set());

    const typeItems = computed(() => ALL_TYPES.map((type) => ({
        type,
        label: getNotificationTitle(type),
        isEnabled: !disabledTypes.value.has(type),
    })));

    const loadSettings = async (): Promise<void> => {
        isLoading.value = true;
        errorMessage.value = '';

        try {
            const settings = await notificationsStore.getBrowserPushSettings();

            disabledTypes.value = new Set(settings.disabledTypes);
        } catch {
            errorMessage.value = uk.notifications.browserPush.settingsLoadFailed;
        } finally {
            isLoading.value = false;
        }
    };

    const toggleType = (type: NotificationType): void => {
        const next = new Set(disabledTypes.value);

        if (next.has(type)) {
            next.delete(type);
        } else {
            next.add(type);
        }

        disabledTypes.value = next;
    };

    const save = async (): Promise<void> => {
        if (isSaving.value) {
            return;
        }

        isSaving.value = true;
        errorMessage.value = '';

        try {
            await notificationsStore.updateBrowserPushSettings([...disabledTypes.value]);
            onClose();
        } catch {
            errorMessage.value = uk.common.errors.serverError;
        } finally {
            isSaving.value = false;
        }
    };

    return {
        errorMessage,
        isLoading,
        isSaving,
        typeItems,
        loadSettings,
        save,
        toggleType,
    };
};
