export interface GetSearchPostsQuery {
    search?: string;
    categoryId?: number;
    sortBy?: 'newest' | 'oldest' | 'popular';
    offset?: number;
    limit?: number;
}
