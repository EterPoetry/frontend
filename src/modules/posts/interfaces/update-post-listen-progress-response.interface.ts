export interface UpdatePostListenProgressResponse {
    listenedMs: number;
    isSuspicious: boolean;
    suspiciousReason: string | null;
}
