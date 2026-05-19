import type { PaymentReturnAction } from '@/modules/payments/interfaces/payment-return-action.type';

export interface PendingPaymentContext {
    action: PaymentReturnAction;
    invoiceId: string;
    cardSignature: string | null;
}
