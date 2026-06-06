import type { AdminComplaintStatus } from '@/modules/admin/types/admin-complaint-status.type';

export interface AdminUserViolation {
    complaintId: number;
    complaintReason: string;
    complaintReasonLabel: string;
    status: AdminComplaintStatus;
    createdAt: string;
    processedAt: string | null;
    expiresAt: string | null;
    adminId: number | null;
    postId: number;
    postStatus: string;
    postRemovedAt: string | null;
    postRestorationDeadline: string | null;
}
