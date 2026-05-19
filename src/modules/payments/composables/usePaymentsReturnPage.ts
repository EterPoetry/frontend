import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import type { PaymentReturnAction } from '@/modules/payments/interfaces/payment-return-action.type';

export interface UsePaymentsReturnPageResult {
    authStore: ReturnType<typeof usePostsAppShell>['authStore'];
    categoryId: ReturnType<typeof usePostsAppShell>['categoryId'];
    closeDialog: () => Promise<void>;
    handleCreateClick: ReturnType<typeof usePostsAppShell>['handleCreateClick'];
    isAuthenticated: ReturnType<typeof usePostsAppShell>['isAuthenticated'];
    isDialogOpen: Ref<boolean>;
    openLogin: ReturnType<typeof usePostsAppShell>['openLogin'];
    openRegister: ReturnType<typeof usePostsAppShell>['openRegister'];
    returnAction: ComputedRef<PaymentReturnAction | null>;
    search: ReturnType<typeof usePostsAppShell>['search'];
    sortBy: ReturnType<typeof usePostsAppShell>['sortBy'];
}

const isPaymentReturnAction = (value: unknown): value is PaymentReturnAction => (
    value === 'checkout' || value === 'update_card'
);

export const usePaymentsReturnPage = (): UsePaymentsReturnPageResult => {
    const route = useRoute();
    const router = useRouter();
    const {
        authStore,
        handleCreateClick,
        isAuthenticated,
        openLogin,
        openRegister,
        search,
        sortBy,
        categoryId,
    } = usePostsAppShell();

    const isDialogOpen = ref(true);

    const returnAction = computed<PaymentReturnAction | null>(() => {
        if (route.query.paymentFlow !== 'subscription' || !isPaymentReturnAction(route.query.paymentAction)) {
            return null;
        }

        return route.query.paymentAction;
    });

    const closeDialog = async (): Promise<void> => {
        isDialogOpen.value = false;
        await router.replace({ name: PostRouteNames.HOME });
    };

    watch(
        returnAction,
        async (value) => {
            if (value) {
                return;
            }

            await router.replace({ name: PostRouteNames.HOME });
        },
        { immediate: true },
    );

    return {
        authStore,
        categoryId,
        closeDialog,
        handleCreateClick,
        isAuthenticated,
        isDialogOpen,
        openLogin,
        openRegister,
        returnAction,
        search,
        sortBy,
    };
};
