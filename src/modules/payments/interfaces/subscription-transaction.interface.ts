import type { SubscriptionTransactionStatus } from '@/modules/payments/interfaces/subscription-transaction-status.type';
import type { SubscriptionTransactionType } from '@/modules/payments/interfaces/subscription-transaction-type.type';

export interface SubscriptionTransaction {
    transactionId: number;
    invoiceId: string;
    status: SubscriptionTransactionStatus;
    type: SubscriptionTransactionType;
    amount: string;
    currency: string;
    isCardUpdating: boolean;
    modifiedDate: string | null;
    createdAt: string;
    updatedAt: string;
}
