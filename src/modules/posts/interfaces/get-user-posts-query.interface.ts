export type UserPostsSortBy = 'createdAt' | 'updatedAt' | 'title' | 'listens';
export type UserPostsSortOrder = 'asc' | 'desc';
export type UserPostsAuthorType = 'author' | 'original';

export interface GetUserPostsQuery {
    search?: string;
    sortBy?: UserPostsSortBy;
    sortOrder?: UserPostsSortOrder;
    authorType?: UserPostsAuthorType;
    offset?: number;
    limit?: number;
}
