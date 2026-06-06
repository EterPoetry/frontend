export interface OffsetPaginationResponse<T> {
    items: T[];
    total: number;
    offset: number;
    limit: number;
}
