export interface PublicConfig {
    recording: {
        freeDurationLimitMinutes: number;
        premiumDurationLimitMinutes: number;
    };
    subscription: {
        priceUsd: number;
    };
}
