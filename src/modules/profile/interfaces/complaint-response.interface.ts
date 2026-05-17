import type { ComplaintStatus } from '@/modules/profile/interfaces/complaint-status.type';

export interface ComplaintResponse {
    complaintId: number;
    authorId: number;
    targetUserId: number;
    targetPostId: number;
    complaintReason: string;
    complaintReasonLabel: string;
    status: ComplaintStatus;
    createdAt: string;
    expiresAt: string | null;
}
