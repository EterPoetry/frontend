import type { SubscriptionCard } from '@/modules/payments/interfaces/subscription-card.interface';
import type { Subscription } from '@/modules/payments/interfaces/subscription.interface';

export interface CardLinkedPayload {
    card: SubscriptionCard;
    subscription: Subscription;
}
