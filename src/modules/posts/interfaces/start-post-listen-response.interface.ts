export interface StartPostListenResponse {
    token: string;
    listenedMs: number;
    trackDurationMs: number;
    isSuspicious: boolean;
}
