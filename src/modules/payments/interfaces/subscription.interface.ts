import { SubscriptionStatus } from '@/modules/payments/enums/subscription-status.enum';
import { SubscriptionCard } from '@/modules/payments/interfaces/subscription-card.interface';

export interface Subscription {
    subscriptionId: number;
    userId: number;
    status: SubscriptionStatus;
    startDate: string | null;
    nextPaymentDate: string | null;
    cancellationDate: string | null;
    walletId: string | null;
    card: SubscriptionCard | null;
}
