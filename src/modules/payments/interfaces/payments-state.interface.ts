import type { PendingPaymentContext } from '@/modules/payments/interfaces/pending-payment-context.interface';
import type { SubscriptionCheckoutResponse } from '@/modules/payments/interfaces/subscription-checkout-response.interface';
import type { SubscriptionTransaction } from '@/modules/payments/interfaces/subscription-transaction.interface';
import type { Subscription } from '@/modules/payments/interfaces/subscription.interface';

export interface PaymentsState {
    subscription: Subscription | null;
    isSubscriptionLoaded: boolean;
    transactions: SubscriptionTransaction[];
    transactionsTotal: number;
    transactionsOffset: number;
    currentCheckout: SubscriptionCheckoutResponse | null;
    pendingPaymentContext: PendingPaymentContext | null;
    isRealtimeConnected: boolean;
}
