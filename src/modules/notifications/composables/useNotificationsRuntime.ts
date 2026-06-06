import { watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useNotificationsStore } from '@/modules/notifications/notifications.store';

export const useNotificationsRuntime = (): void => {
    const authStore = useAuthStore();
    const notificationsStore = useNotificationsStore();
    let initializedToken: string | null = null;
    let initializationRequestId = 0;

    watch(
        [() => authStore.isInitialized, () => authStore.token],
        ([isInitialized, token]) => {
            if (!isInitialized) {
                return;
            }

            if (!token) {
                initializedToken = null;
                initializationRequestId += 1;
                notificationsStore.disconnectNotificationsSocket();
                notificationsStore.resetState();
                return;
            }

            if (initializedToken === token) {
                return;
            }

            initializedToken = token;
            initializationRequestId += 1;

            notificationsStore.connectNotificationsSocket(token);
        },
        { immediate: true },
    );
};
