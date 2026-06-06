export interface AdminUsersListQuery {
    search?: string;
    sortBy?: 'createdAt' | 'name' | 'username' | 'postsCount' | 'activeViolationsCount';
    sortOrder?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
}
