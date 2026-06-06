import type { AdminComplaintStatus } from '@/modules/admin/types/admin-complaint-status.type';

export interface AdminComplaintsListQuery {
    search?: string;
    status?: AdminComplaintStatus;
    sortBy?: 'createdAt' | 'status' | 'reason';
    sortOrder?: 'asc' | 'desc';
    offset?: number;
    limit?: number;
}
