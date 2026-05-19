import { watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { usePaymentsStore } from '@/modules/payments/payments.store';

export const usePaymentsRuntime = (): void => {
    const authStore = useAuthStore();
    const paymentsStore = usePaymentsStore();
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
                paymentsStore.disconnectPaymentsSocket();
                paymentsStore.resetState();
                return;
            }

            if (initializedToken === token) {
                return;
            }

            initializedToken = token;
            initializationRequestId += 1;
            const requestId = initializationRequestId;

            void paymentsStore.initializeAuthenticatedState(token).catch(() => {
                if (requestId !== initializationRequestId) {
                    return;
                }
            });
        },
        { immediate: true },
    );
};
