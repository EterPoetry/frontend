export interface PostListenSession {
    postId: number;
    sessionId: string;
    token: string;
    listenedMs: number;
    trackDurationMs: number;
    isSuspicious: boolean;
}
