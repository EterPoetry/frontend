export type SubscriptionTransactionStatus =
    | 'created'
    | 'processing'
    | 'hold'
    | 'success'
    | 'failure'
    | 'reversed'
    | 'expired'
    | null;
