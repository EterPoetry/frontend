export interface AdminListQuery {
    search?: string;
    sortBy?: 'createdAt' | 'name' | 'email';
    sortOrder?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
}
