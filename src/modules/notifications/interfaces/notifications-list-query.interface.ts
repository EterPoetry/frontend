export interface NotificationsListQuery {
    limit?: number;
    cursor?: string;
    status?: 'all' | 'unread';
    type?: 'comments' | 'follows' | 'mentions' | 'likes' | 'system';
}
