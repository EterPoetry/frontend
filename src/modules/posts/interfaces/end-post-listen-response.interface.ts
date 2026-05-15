export interface EndPostListenResponse {
    listenedMs: number;
    isSuspicious: boolean;
    suspiciousReason: string | null;
    counted: boolean;
    countedAt: string | null;
    thresholdReached: boolean;
}
