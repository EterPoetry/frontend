import { isAxiosError } from 'axios';
import { computed, onBeforeUnmount, ref, toRef, watch, type ComponentPublicInstance, type ComputedRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { useAuthStore } from '@/modules/auth/auth.store';
import { DEFAULT_FREE_DURATION_LIMIT_MINUTES, DEFAULT_PREMIUM_DURATION_LIMIT_MINUTES } from '@/modules/posts/constants/post-limits.constants';
import { usePostsStore } from '@/modules/posts/posts.store';
import { SUBSCRIPTION_RECONCILIATION_POLL_MS } from '@/modules/payments/constants/payments.constants';
import { SubscriptionStatus } from '@/modules/payments/enums/subscription-status.enum';
import type { PaymentReturnAction } from '@/modules/payments/interfaces/payment-return-action.type';
import type { PendingPaymentContext } from '@/modules/payments/interfaces/pending-payment-context.interface';
import type { SubscriptionTransaction } from '@/modules/payments/interfaces/subscription-transaction.interface';
import { usePaymentsStore } from '@/modules/payments/payments.store';
import { getSubscriptionCardSignature } from '@/modules/payments/utils/subscription-card.utils';
import { uk } from '@/shared/locales/uk';

interface UseSubscriptionDialogProperties {
    isOpen: boolean;
    returnAction?: PaymentReturnAction | null;
}

export interface UseSubscriptionDialogResult {
    canCancel: ComputedRef<boolean>;
    canLoadMoreTransactions: ComputedRef<boolean>;
    canOpenTransactionsDialog: ComputedRef<boolean>;
    canUpdateCard: ComputedRef<boolean>;
    isCardLoading: ComputedRef<boolean>;
    closeDialog: () => void;
    closeTransactionsDialog: () => void;
    currentViewClassName: ComputedRef<string>;
    errorMessage: Ref<string>;
    formatAmount: (amount: string, currency: string) => string;
    formatDate: (value: string | null) => string;
    freeDurationLimitMinutes: ComputedRef<number>;
    getTransactionStatusClassName: (transaction: SubscriptionTransaction) => string;
    getTransactionStatusLabel: (transaction: SubscriptionTransaction) => string;
    handleCancellationConfirm: () => Promise<void>;
    handleCardUpdate: () => Promise<void>;
    handlePrimaryAction: () => Promise<void>;
    hasVisibleTransactions: ComputedRef<boolean>;
    isCancelConfirmOpen: Ref<boolean>;
    isCancellationSubmitting: Ref<boolean>;
    isCardUpdateSubmitting: Ref<boolean>;
    isCheckoutSubmitting: Ref<boolean>;
    isLoading: Ref<boolean>;
    isPastDue: ComputedRef<boolean>;
    isTransactionsDialogOpen: Ref<boolean>;
    isTransactionsLoading: Ref<boolean>;
    isTransactionsLoadingMore: Ref<boolean>;
    noticeMessage: ComputedRef<string>;
    openTransactionsDialog: () => void;
    premiumDurationLimitMinutes: ComputedRef<number>;
    primaryActionLabel: ComputedRef<string>;
    reconciliationNotice: ComputedRef<{
        title: string;
        message?: string;
        isPending: boolean;
    } | null>;
    shouldShowManagement: ComputedRef<boolean>;
    statusClassName: ComputedRef<string>;
    statusLabel: ComputedRef<string>;
    subscription: ComputedRef<ReturnType<typeof usePaymentsStore>['subscription']>;
    subscriptionPriceUsd: ComputedRef<number>;
    title: ComputedRef<string>;
    subtitle: ComputedRef<string>;
    transactionsDialogMessage: ComputedRef<string>;
    setTransactionsDialogBody: (element: Element | ComponentPublicInstance | null) => void;
    setTransactionsLoadMoreTrigger: (element: Element | ComponentPublicInstance | null) => void;
    visibleTransactions: ComputedRef<SubscriptionTransaction[]>;
}

type ReconciliationStatus = 'idle' | 'pending' | 'success' | 'failure';

export const useSubscriptionDialog = (
    props: UseSubscriptionDialogProperties,
    onClose: () => void,
): UseSubscriptionDialogResult => {
    const authStore = useAuthStore();
    const paymentsStore = usePaymentsStore();
    const postsStore = usePostsStore();
    const router = useRouter();
    const isOpen = toRef(props, 'isOpen');
    const returnAction = toRef(props, 'returnAction');

    const isLoading = ref(false);
    const isTransactionsLoading = ref(false);
    const isCheckoutSubmitting = ref(false);
    const isCardUpdateSubmitting = ref(false);
    const isCancellationSubmitting = ref(false);
    const isCancelConfirmOpen = ref(false);
    const isTransactionsDialogOpen = ref(false);
    const errorMessage = ref('');
    const lastOpenedCheckoutInvoiceId = ref<string | null>(null);
    const reconciliationStatus = ref<ReconciliationStatus>('idle');
    const isTransactionsLoadingMore = ref(false);
    const transactionsLoadMoreTrigger = ref<HTMLElement | null>(null);
    const transactionsDialogBody = ref<HTMLElement | null>(null);
    let reconciliationTimer: ReturnType<typeof setTimeout> | null = null;
    let transactionsObserver: IntersectionObserver | null = null;

    const subscription = computed(() => paymentsStore.subscription);
    const config = computed(() => postsStore.config);
    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const freeDurationLimitMinutes = computed(() => config.value?.recording.freeDurationLimitMinutes ?? DEFAULT_FREE_DURATION_LIMIT_MINUTES);
    const premiumDurationLimitMinutes = computed(() => config.value?.recording.premiumDurationLimitMinutes ?? DEFAULT_PREMIUM_DURATION_LIMIT_MINUTES);
    const subscriptionPriceUsd = computed(() => {
        const rawPriceUsd = config.value?.subscription.priceUsd ?? 5;

        if (!Number.isFinite(rawPriceUsd)) {
            return 5;
        }

        return Number.isInteger(rawPriceUsd) && rawPriceUsd >= 100
            ? rawPriceUsd / 100
            : rawPriceUsd;
    });
    const visibleTransactions = computed(() => paymentsStore.transactions.filter((item) => !item.isCardUpdating));
    const hasVisibleTransactions = computed(() => visibleTransactions.value.length > 0);
    const canOpenTransactionsDialog = computed(() => (
        isTransactionsLoading.value
        || hasVisibleTransactions.value
        || paymentsStore.transactionsTotal > 0
        || reconciliationStatus.value === 'failure'
    ));
    const canLoadMoreTransactions = computed(() => (
        paymentsStore.transactions.length < paymentsStore.transactionsTotal
    ));
    const status = computed(() => subscription.value?.status ?? null);
    const isActive = computed(() => status.value === SubscriptionStatus.ACTIVE);
    const isPastDue = computed(() => status.value === SubscriptionStatus.PAST_DUE);
    const canUpdateCard = computed(() => isActive.value && paymentsStore.hasLinkedCard);
    const canCancel = computed(() => isActive.value || isPastDue.value);
    const shouldShowManagement = computed(() => isActive.value || isPastDue.value);
    const activeReturnAction = computed<PaymentReturnAction | null>(() => returnAction.value ?? null);
    const isCardLoading = computed(() => (
        isActive.value
        && !subscription.value?.card
        && reconciliationStatus.value !== 'failure'
    ));
    const currentViewClassName = computed(() => {
        if (isCancelConfirmOpen.value) {
            return 'subscription-dialog__surface--confirm';
        }

        if (shouldShowManagement.value) {
            return 'subscription-dialog__surface--management';
        }

        return 'subscription-dialog__surface--checkout';
    });
    const title = computed(() => shouldShowManagement.value ? uk.payments.dialog.manageTitle : uk.payments.dialog.checkoutTitle);
    const subtitle = computed(() => shouldShowManagement.value ? '' : uk.payments.dialog.checkoutSubtitle);
    const primaryActionLabel = computed(() => {
        if (!isAuthenticated.value) {
            return uk.payments.actions.register;
        }

        if (isPastDue.value) {
            return uk.payments.actions.renew;
        }

        if (subscription.value?.status === SubscriptionStatus.CREATED) {
            return uk.payments.actions.retryCheckout;
        }

        return uk.payments.actions.buy;
    });
    const statusLabel = computed(() => {
        switch (status.value) {
            case SubscriptionStatus.ACTIVE:
                return uk.payments.status.active;
            case SubscriptionStatus.PAST_DUE:
                return uk.payments.status.pastDue;
            case SubscriptionStatus.CANCELLED:
                return uk.payments.status.cancelled;
            case SubscriptionStatus.CREATED:
                return uk.payments.status.created;
            case SubscriptionStatus.EXPIRED:
                return uk.payments.status.expired;
            default:
                return '';
        }
    });
    const statusClassName = computed(() => {
        if (isActive.value) {
            return 'subscription-dialog__status-value--active';
        }

        if (isPastDue.value) {
            return 'subscription-dialog__status-value--warning';
        }

        return 'subscription-dialog__status-value--muted';
    });
    const noticeMessage = computed(() => {
        switch (status.value) {
            case SubscriptionStatus.PAST_DUE:
                return uk.payments.notices.pastDue;
            case SubscriptionStatus.CANCELLED:
                return subscription.value?.cancellationDate
                    ? uk.payments.notices.cancelledOn(formatDate(subscription.value.cancellationDate))
                    : uk.payments.notices.cancelled;
            case SubscriptionStatus.CREATED:
                return uk.payments.notices.created;
            case SubscriptionStatus.EXPIRED:
                return uk.payments.notices.expired;
            default:
                return '';
        }
    });
    const reconciliationNotice = computed(() => {
        if (!activeReturnAction.value || reconciliationStatus.value === 'idle') {
            return null;
        }

        if (activeReturnAction.value === 'checkout') {
            if (reconciliationStatus.value === 'success') {
                return {
                    title: uk.payments.reconciliation.checkoutSuccessTitle,
                    message: uk.payments.reconciliation.checkoutSuccess,
                    isPending: false,
                };
            }

            if (reconciliationStatus.value === 'failure') {
                return {
                    title: uk.payments.reconciliation.checkoutFailureTitle,
                    message: uk.payments.reconciliation.checkoutFailure,
                    isPending: false,
                };
            }

            return {
                title: uk.payments.reconciliation.checkoutPendingTitle,
                isPending: true,
            };
        }

        if (reconciliationStatus.value === 'success') {
            return {
                title: uk.payments.reconciliation.cardSuccessTitle,
                message: uk.payments.reconciliation.cardSuccess,
                isPending: false,
            };
        }

        if (reconciliationStatus.value === 'failure') {
            return {
                title: uk.payments.reconciliation.cardFailureTitle,
                message: uk.payments.reconciliation.cardFailure,
                isPending: false,
            };
        }

        return {
            title: uk.payments.reconciliation.cardPendingTitle,
            message: uk.payments.reconciliation.cardPending,
            isPending: true,
        };
    });
    const transactionsDialogMessage = computed(() => reconciliationStatus.value === 'failure'
        ? reconciliationNotice.value?.message ?? uk.payments.transactions.returnFailureEmpty
        : '');

    const stopReconciliationPolling = (): void => {
        if (!reconciliationTimer) {
            return;
        }

        clearTimeout(reconciliationTimer);
        reconciliationTimer = null;
    };

    const stopTransactionsObserver = (): void => {
        if (!transactionsObserver) {
            return;
        }

        transactionsObserver.disconnect();
        transactionsObserver = null;
    };

    const getPendingContext = (): PendingPaymentContext | null => {
        if (!activeReturnAction.value) {
            return null;
        }

        return paymentsStore.getPendingPaymentContext(activeReturnAction.value);
    };

    const getRelevantTransaction = (
        action: PaymentReturnAction,
        pendingContext: PendingPaymentContext | null,
    ): SubscriptionTransaction | null => {
        if (pendingContext) {
            const matchedTransaction = paymentsStore.transactions.find((item) => item.invoiceId === pendingContext.invoiceId);

            if (matchedTransaction) {
                return matchedTransaction;
            }
        }

        if (action === 'update_card') {
            return paymentsStore.transactions.find((item) => item.isCardUpdating) ?? null;
        }

        return paymentsStore.transactions.find((item) => !item.isCardUpdating) ?? null;
    };

    const resolveReconciliationStatus = (): Exclude<ReconciliationStatus, 'idle'> => {
        if (!activeReturnAction.value) {
            return 'pending';
        }

        const pendingContext = getPendingContext();
        const relevantTransaction = getRelevantTransaction(activeReturnAction.value, pendingContext);

        if (activeReturnAction.value === 'checkout') {
            if (relevantTransaction?.status === 'success' || subscription.value?.status === SubscriptionStatus.ACTIVE) {
                return 'success';
            }

            if (relevantTransaction
                && (relevantTransaction.status === 'failure'
                    || relevantTransaction.status === 'expired'
                    || relevantTransaction.status === 'reversed')) {
                return 'failure';
            }

            return 'pending';
        }

        const currentCardSignature = getSubscriptionCardSignature(subscription.value?.card);

        if (relevantTransaction
            && (relevantTransaction.status === 'failure'
                || relevantTransaction.status === 'expired'
                || relevantTransaction.status === 'reversed')) {
            return 'failure';
        }

        if (relevantTransaction?.status === 'success') {
            return 'success';
        }

        if (pendingContext?.cardSignature && currentCardSignature && pendingContext.cardSignature !== currentCardSignature) {
            return 'success';
        }

        return 'pending';
    };

    const scheduleReconciliationPoll = (): void => {
        stopReconciliationPolling();
        reconciliationTimer = setTimeout(async () => {
            if (!isOpen.value || !activeReturnAction.value || reconciliationStatus.value !== 'pending') {
                return;
            }

            try {
                await paymentsStore.reconcileSubscriptionState();
            } catch (_error) {
                if (!errorMessage.value) {
                    errorMessage.value = uk.payments.errors.reconciliationFailed;
                }
            }
        }, SUBSCRIPTION_RECONCILIATION_POLL_MS);
    };

    const syncReconciliationStatus = (): void => {
        if (!activeReturnAction.value) {
            reconciliationStatus.value = 'idle';
            stopReconciliationPolling();
            return;
        }

        const nextStatus = resolveReconciliationStatus();
        reconciliationStatus.value = nextStatus;

        if (nextStatus === 'pending') {
            scheduleReconciliationPoll();
            return;
        }

        stopReconciliationPolling();
        paymentsStore.clearPendingPaymentContext();
    };

    const formatDate = (value: string | null): string => {
        if (!value) {
            return uk.payments.valueFallback;
        }

        const parsedDate = new Date(value);

        if (Number.isNaN(parsedDate.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(parsedDate);
    };

    const formatAmount = (amount: string, currency: string): string => {
        const numericAmount = Number.parseFloat(amount);
        const normalizedCurrency = currency === '980'
            ? 'UAH'
            : currency === '840'
                ? 'USD'
                : currency;

        if (!Number.isFinite(numericAmount)) {
            return `${amount} ${normalizedCurrency}`;
        }

        try {
            return new Intl.NumberFormat(normalizedCurrency === 'UAH' ? 'uk-UA' : 'en-US', {
                style: 'currency',
                currency: normalizedCurrency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            }).format(numericAmount);
        } catch (_error) {
            return `${numericAmount} ${normalizedCurrency}`;
        }
    };

    const getTransactionStatusLabel = (transaction: SubscriptionTransaction): string => {
        switch (transaction.status) {
            case 'success':
                return uk.payments.transactions.status.success;
            case 'failure':
                return uk.payments.transactions.status.failure;
            case 'processing':
                return uk.payments.transactions.status.processing;
            case 'hold':
                return uk.payments.transactions.status.hold;
            case 'reversed':
                return uk.payments.transactions.status.reversed;
            case 'expired':
                return uk.payments.transactions.status.expired;
            case 'created':
            case null:
                return uk.payments.transactions.status.created;
            default:
                return transaction.status;
        }
    };

    const getTransactionStatusClassName = (transaction: SubscriptionTransaction): string => {
        if (transaction.status === 'success') {
            return 'subscription-dialog__transaction-status--success';
        }

        if (transaction.status === 'failure' || transaction.status === 'reversed' || transaction.status === 'expired') {
            return 'subscription-dialog__transaction-status--failure';
        }

        return 'subscription-dialog__transaction-status--pending';
    };

    const loadDialogData = async (): Promise<void> => {
        errorMessage.value = '';

        if (!postsStore.config) {
            try {
                await postsStore.getConfig();
            } catch (_error) {
            }
        }

        if (!isAuthenticated.value) {
            return;
        }

        isLoading.value = true;
        isTransactionsLoading.value = true;

        try {
            const [subscriptionResult, transactionsResult] = await Promise.allSettled([
                paymentsStore.getSubscription(),
                paymentsStore.getSubscriptionTransactions(),
            ]);

            if (subscriptionResult.status === 'rejected') {
                errorMessage.value = uk.payments.errors.loadFailed;
            }

            if (transactionsResult.status === 'rejected' && !errorMessage.value) {
                errorMessage.value = uk.payments.errors.transactionsLoadFailed;
            }
        } finally {
            isLoading.value = false;
            isTransactionsLoading.value = false;
        }
    };

    const resetDialogState = (): void => {
        stopReconciliationPolling();
        isCancelConfirmOpen.value = false;
        isTransactionsDialogOpen.value = false;
        errorMessage.value = '';
        reconciliationStatus.value = 'idle';
    };

    const closeDialog = (): void => {
        resetDialogState();
        onClose();
    };

    const openTransactionsDialog = (): void => {
        if (!canOpenTransactionsDialog.value) {
            return;
        }

        isTransactionsDialogOpen.value = true;
    };

    const closeTransactionsDialog = (): void => {
        isTransactionsDialogOpen.value = false;
    };

    const setTransactionsDialogBody = (element: Element | ComponentPublicInstance | null): void => {
        transactionsDialogBody.value = element instanceof HTMLElement ? element : null;
    };

    const setTransactionsLoadMoreTrigger = (element: Element | ComponentPublicInstance | null): void => {
        transactionsLoadMoreTrigger.value = element instanceof HTMLElement ? element : null;
    };

    const loadMoreTransactions = async (): Promise<void> => {
        if (!isTransactionsDialogOpen.value
            || isTransactionsLoading.value
            || isTransactionsLoadingMore.value
            || !canLoadMoreTransactions.value) {
            return;
        }

        isTransactionsLoadingMore.value = true;

        try {
            await paymentsStore.getSubscriptionTransactions({
                offset: paymentsStore.transactionsOffset,
            });
        } catch (_error) {
            errorMessage.value = uk.payments.errors.transactionsLoadFailed;
        } finally {
            isTransactionsLoadingMore.value = false;
        }
    };

    const setupTransactionsObserver = (): void => {
        stopTransactionsObserver();

        if (!isTransactionsDialogOpen.value || !transactionsLoadMoreTrigger.value || !transactionsDialogBody.value) {
            return;
        }

        transactionsObserver = new IntersectionObserver((entries) => {
            const [entry] = entries;

            if (!entry?.isIntersecting) {
                return;
            }

            void loadMoreTransactions();
        }, {
            root: transactionsDialogBody.value,
            rootMargin: '160px 0px',
        });

        transactionsObserver.observe(transactionsLoadMoreTrigger.value);
    };

    const handlePrimaryAction = async (): Promise<void> => {
        errorMessage.value = '';

        if (!isAuthenticated.value) {
            await router.push({ name: AuthRouteNames.REGISTER });
            closeDialog();
            return;
        }

        isCheckoutSubmitting.value = true;

        try {
            const checkout = await paymentsStore.createSubscriptionCheckout();

            if (checkout.checkoutUrl) {
                window.location.assign(checkout.checkoutUrl);
                return;
            }

            errorMessage.value = uk.payments.errors.checkoutFailed;
        } catch (error: unknown) {
            if (isAxiosError(error) && error.response?.status === 409) {
                await paymentsStore.getSubscription();
            }

            errorMessage.value = uk.payments.errors.checkoutFailed;
        } finally {
            isCheckoutSubmitting.value = false;
        }
    };

    const handleCardUpdate = async (): Promise<void> => {
        errorMessage.value = '';
        isCardUpdateSubmitting.value = true;

        try {
            const checkout = await paymentsStore.createCardUpdateCheckout();

            if (checkout.checkoutUrl) {
                window.location.assign(checkout.checkoutUrl);
                return;
            }

            errorMessage.value = uk.payments.errors.cardUpdateFailed;
        } catch (_error) {
            errorMessage.value = uk.payments.errors.cardUpdateFailed;
        } finally {
            isCardUpdateSubmitting.value = false;
        }
    };

    const handleCancellationConfirm = async (): Promise<void> => {
        errorMessage.value = '';
        isCancellationSubmitting.value = true;

        try {
            await paymentsStore.cancelSubscription();
            isCancelConfirmOpen.value = false;
        } catch (_error) {
            errorMessage.value = uk.payments.errors.cancelFailed;
        } finally {
            isCancellationSubmitting.value = false;
        }
    };

    watch(
        isOpen,
        (isOpen) => {
            if (!isOpen) {
                resetDialogState();
                return;
            }

            void loadDialogData().finally(() => {
                syncReconciliationStatus();
            });
        },
    );

    watch(
        [activeReturnAction, () => paymentsStore.subscription, () => paymentsStore.transactions],
        () => {
            if (!isOpen.value || !activeReturnAction.value) {
                return;
            }

            syncReconciliationStatus();
        },
    );

    watch(
        [canOpenTransactionsDialog, reconciliationStatus],
        ([canOpen, statusValue]) => {
            if (!canOpen) {
                isTransactionsDialogOpen.value = false;
                return;
            }

            if (statusValue === 'failure') {
                isTransactionsDialogOpen.value = true;
            }
        },
        { immediate: true },
    );

    watch(
        [isTransactionsDialogOpen, transactionsLoadMoreTrigger, transactionsDialogBody],
        () => {
            setupTransactionsObserver();
        },
    );

    watch(
        () => paymentsStore.currentCheckout,
        (checkout) => {
            if (!checkout || checkout.invoiceId === lastOpenedCheckoutInvoiceId.value) {
                return;
            }

            lastOpenedCheckoutInvoiceId.value = checkout.invoiceId;
        },
        { deep: true },
    );

    onBeforeUnmount(() => {
        stopReconciliationPolling();
        stopTransactionsObserver();
    });

    return {
        canCancel,
        canLoadMoreTransactions,
        canOpenTransactionsDialog,
        canUpdateCard,
        isCardLoading,
        closeDialog,
        closeTransactionsDialog,
        currentViewClassName,
        errorMessage,
        formatAmount,
        formatDate,
        freeDurationLimitMinutes,
        getTransactionStatusClassName,
        getTransactionStatusLabel,
        handleCancellationConfirm,
        handleCardUpdate,
        handlePrimaryAction,
        hasVisibleTransactions,
        isCancelConfirmOpen,
        isCancellationSubmitting,
        isCardUpdateSubmitting,
        isCheckoutSubmitting,
        isLoading,
        isPastDue,
        isTransactionsDialogOpen,
        isTransactionsLoading,
        isTransactionsLoadingMore,
        noticeMessage,
        openTransactionsDialog,
        premiumDurationLimitMinutes,
        primaryActionLabel,
        reconciliationNotice,
        shouldShowManagement,
        statusClassName,
        statusLabel,
        subscription,
        subscriptionPriceUsd,
        subtitle,
        title,
        transactionsDialogMessage,
        setTransactionsDialogBody,
        setTransactionsLoadMoreTrigger,
        visibleTransactions,
    };
};
