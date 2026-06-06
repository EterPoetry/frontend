export interface AdminUserListItem {
    userId: number;
    name: string;
    username: string;
    email: string;
    createdAt: string;
    blockedAt: string | null;
    postsCount: number;
    activeViolationsCount: number;
}
