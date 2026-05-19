import type { SubscriptionTransaction } from '@/modules/payments/interfaces/subscription-transaction.interface';

export interface SubscriptionTransactionsResponse {
    items: SubscriptionTransaction[];
    total: number;
    offset: number;
}
