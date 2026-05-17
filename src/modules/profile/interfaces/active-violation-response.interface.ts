import type { ActiveViolationTargetPost } from '@/modules/profile/interfaces/active-violation-target-post.interface';
import type { ComplaintReason } from '@/modules/profile/interfaces/complaint-reason.type';
import type { ComplaintStatus } from '@/modules/profile/interfaces/complaint-status.type';

export interface ActiveViolationResponse {
    complaintId: number;
    complaintReason: ComplaintReason | string;
    status: ComplaintStatus;
    createdAt: string;
    expiresAt: string | null;
    targetPost: ActiveViolationTargetPost;
}
