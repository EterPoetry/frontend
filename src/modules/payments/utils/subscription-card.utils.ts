import type { SubscriptionCard } from '@/modules/payments/interfaces/subscription-card.interface';

export const getSubscriptionCardSignature = (card: SubscriptionCard | null | undefined): string | null => {
    if (!card) {
        return null;
    }

    return `${card.paymentSystem}:${card.maskedNumber}`;
};
