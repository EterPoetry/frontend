export interface NotificationsListQuery {
    limit?: number;
    cursor?: string;
    status?: 'all' | 'unread';
    type?: 'comments' | 'follows' | 'likes' | 'system';
}
