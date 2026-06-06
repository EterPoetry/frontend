export interface AdminCategoriesListQuery {
    search?: string;
    sortBy?: 'categoryId' | 'categoryName';
    sortOrder?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
}
