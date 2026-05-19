import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import api from '@/core/api';
import { DEFAULT_SUBSCRIPTION_TRANSACTIONS_LIMIT } from '@/modules/payments/constants/payments.constants';
import { SubscriptionStatus } from '@/modules/payments/enums/subscription-status.enum';
import type { CardLinkedPayload } from '@/modules/payments/interfaces/card-linked-payload.interface';
import type { GetSubscriptionTransactionsQuery } from '@/modules/payments/interfaces/get-subscription-transactions-query.interface';
import type { PaymentReturnAction } from '@/modules/payments/interfaces/payment-return-action.type';
import type { PaymentsState } from '@/modules/payments/interfaces/payments-state.interface';
import type { PendingPaymentContext } from '@/modules/payments/interfaces/pending-payment-context.interface';
import type { SubscriptionCheckoutResponse } from '@/modules/payments/interfaces/subscription-checkout-response.interface';
import type { SubscriptionTransactionStatus } from '@/modules/payments/interfaces/subscription-transaction-status.type';
import type { SubscriptionTransaction } from '@/modules/payments/interfaces/subscription-transaction.interface';
import type { SubscriptionTransactionsResponse } from '@/modules/payments/interfaces/subscription-transactions-response.interface';
import type { Subscription } from '@/modules/payments/interfaces/subscription.interface';
import { getSubscriptionCardSignature } from '@/modules/payments/utils/subscription-card.utils';

const PENDING_PAYMENT_CONTEXT_STORAGE_KEY = 'payments.pendingSubscriptionContext';

const readPendingPaymentContext = (): PendingPaymentContext | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const rawValue = window.localStorage.getItem(PENDING_PAYMENT_CONTEXT_STORAGE_KEY);

    if (!rawValue) {
        return null;
    }

    try {
        const parsedValue = JSON.parse(rawValue) as Partial<PendingPaymentContext>;

        if ((parsedValue.action !== 'checkout' && parsedValue.action !== 'update_card')
            || typeof parsedValue.invoiceId !== 'string'
            || parsedValue.invoiceId.trim() === '') {
            window.localStorage.removeItem(PENDING_PAYMENT_CONTEXT_STORAGE_KEY);
            return null;
        }

        return {
            action: parsedValue.action,
            invoiceId: parsedValue.invoiceId,
            cardSignature: typeof parsedValue.cardSignature === 'string' ? parsedValue.cardSignature : null,
        };
    } catch (_error) {
        window.localStorage.removeItem(PENDING_PAYMENT_CONTEXT_STORAGE_KEY);
        return null;
    }
};

const persistPendingPaymentContext = (context: PendingPaymentContext | null): void => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!context) {
        window.localStorage.removeItem(PENDING_PAYMENT_CONTEXT_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(PENDING_PAYMENT_CONTEXT_STORAGE_KEY, JSON.stringify(context));
};

const createInitialState = (pendingPaymentContext: PendingPaymentContext | null = readPendingPaymentContext()): PaymentsState => ({
    subscription: null,
    isSubscriptionLoaded: false,
    transactions: [],
    transactionsTotal: 0,
    transactionsOffset: 0,
    currentCheckout: null,
    pendingPaymentContext,
    isRealtimeConnected: false,
});

const isFinalTransactionStatus = (status: SubscriptionTransactionStatus): boolean => (
    status === 'success'
    || status === 'failure'
    || status === 'reversed'
    || status === 'expired'
);

const upsertTransaction = (
    transactions: SubscriptionTransaction[],
    nextTransaction: SubscriptionTransaction,
): SubscriptionTransaction[] => {
    const existingIndex = transactions.findIndex((item) => item.transactionId === nextTransaction.transactionId);

    if (existingIndex === -1) {
        return [nextTransaction, ...transactions];
    }

    return transactions.map((item, index) => index === existingIndex ? nextTransaction : item);
};

let paymentsSocket: Socket | null = null;
let paymentsSocketToken: string | null = null;

export const usePaymentsStore = defineStore('payments', {
    state: (): PaymentsState => createInitialState(),

    getters: {
        isPremium: (state): boolean => state.subscription?.status === SubscriptionStatus.ACTIVE,
        hasLinkedCard: (state): boolean => !!state.subscription?.card,
    },

    actions: {
        async initializeAuthenticatedState(token: string): Promise<void> {
            this.connectPaymentsSocket(token);
            await this.getSubscription();
        },

        resetState(): void {
            persistPendingPaymentContext(null);
            Object.assign(this, createInitialState(null));
        },

        async getSubscription(): Promise<Subscription | null> {
            const response = await api.get<Subscription | null>('/payments/subscription');
            this.subscription = response.data;
            this.isSubscriptionLoaded = true;

            return this.subscription;
        },

        async createSubscriptionCheckout(): Promise<SubscriptionCheckoutResponse> {
            const response = await api.post<SubscriptionCheckoutResponse>('/payments/subscription/checkout');
            this.currentCheckout = response.data;
            this.setPendingPaymentContext({
                action: 'checkout',
                invoiceId: response.data.invoiceId,
                cardSignature: null,
            });

            return this.currentCheckout;
        },

        async cancelSubscription(): Promise<boolean> {
            const response = await api.delete<{ ok: boolean }>('/payments/subscription');

            if (response.data.ok) {
                await this.getSubscription();
            }

            return response.data.ok;
        },

        async getSubscriptionTransactions(
            query: GetSubscriptionTransactionsQuery = {},
        ): Promise<SubscriptionTransactionsResponse> {
            const normalizedQuery: Required<GetSubscriptionTransactionsQuery> = {
                offset: query.offset ?? 0,
                limit: query.limit ?? DEFAULT_SUBSCRIPTION_TRANSACTIONS_LIMIT,
            };
            const response = await api.get<SubscriptionTransactionsResponse>('/payments/subscription/transactions', {
                params: normalizedQuery,
            });
            const nextItems = response.data.items;

            this.transactions = normalizedQuery.offset > 0
                ? [...this.transactions, ...nextItems]
                : nextItems;
            this.transactionsTotal = response.data.total;
            this.transactionsOffset = this.transactions.length;

            return {
                ...response.data,
                items: this.transactions,
                offset: this.transactionsOffset,
            };
        },

        async createCardUpdateCheckout(): Promise<SubscriptionCheckoutResponse> {
            const response = await api.post<SubscriptionCheckoutResponse>('/payments/subscription/card/update');
            this.currentCheckout = response.data;
            this.setPendingPaymentContext({
                action: 'update_card',
                invoiceId: response.data.invoiceId,
                cardSignature: getSubscriptionCardSignature(this.subscription?.card),
            });

            return this.currentCheckout;
        },

        async reconcileSubscriptionState(): Promise<void> {
            await Promise.all([
                this.getSubscription(),
                this.getSubscriptionTransactions(),
            ]);
        },

        setPendingPaymentContext(context: PendingPaymentContext | null): void {
            this.pendingPaymentContext = context;
            persistPendingPaymentContext(context);
        },

        clearPendingPaymentContext(): void {
            this.setPendingPaymentContext(null);
        },

        getPendingPaymentContext(action: PaymentReturnAction): PendingPaymentContext | null {
            if (!this.pendingPaymentContext || this.pendingPaymentContext.action !== action) {
                return null;
            }

            return this.pendingPaymentContext;
        },

        connectPaymentsSocket(token: string): void {
            if (paymentsSocket && paymentsSocketToken === token) {
                return;
            }

            this.disconnectPaymentsSocket();

            paymentsSocketToken = token;
            paymentsSocket = io(`${import.meta.env.VITE_API_URL}/payments`, {
                auth: {
                    token,
                },
                withCredentials: true,
            });

            paymentsSocket.on('connect', () => {
                this.isRealtimeConnected = true;
            });

            paymentsSocket.on('disconnect', () => {
                this.isRealtimeConnected = false;
            });

            paymentsSocket.on('checkout_created', (payload: SubscriptionCheckoutResponse) => {
                this.currentCheckout = payload;
            });

            paymentsSocket.on('transaction_updated', (payload: SubscriptionTransaction) => {
                this.transactions = upsertTransaction(this.transactions, payload);
                this.transactionsTotal = Math.max(this.transactionsTotal, this.transactions.length);

                if (this.pendingPaymentContext?.action === 'checkout'
                    && this.pendingPaymentContext.invoiceId === payload.invoiceId
                    && isFinalTransactionStatus(payload.status)) {
                    this.clearPendingPaymentContext();
                }

                if (isFinalTransactionStatus(payload.status)) {
                    void this.getSubscription();
                }
            });

            paymentsSocket.on('card_linked', (payload: CardLinkedPayload) => {
                this.subscription = payload.subscription;
                this.clearPendingPaymentContext();
            });
        },

        disconnectPaymentsSocket(): void {
            if (paymentsSocket) {
                paymentsSocket.disconnect();
                paymentsSocket = null;
            }

            paymentsSocketToken = null;
            this.isRealtimeConnected = false;
        },
    },
});
