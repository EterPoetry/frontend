import type { AdminAccount } from '@/modules/admin/interfaces/admin-account.interface';
import type { AdminComplaintAuthor } from '@/modules/admin/interfaces/admin-complaint-author.interface';
import type { AdminComplaintTargetPost } from '@/modules/admin/interfaces/admin-complaint-target-post.interface';
import type { AdminComplaintTargetUser } from '@/modules/admin/interfaces/admin-complaint-target-user.interface';
import type { AdminComplaintStatus } from '@/modules/admin/types/admin-complaint-status.type';

export interface AdminComplaintItem {
    complaintId: number;
    complaintReason: string;
    complaintReasonLabel: string;
    status: AdminComplaintStatus;
    createdAt: string;
    processedAt: string | null;
    expiresAt: string | null;
    author: AdminComplaintAuthor;
    targetUser: AdminComplaintTargetUser;
    targetPost: AdminComplaintTargetPost;
    processedByAdmin: AdminAccount | null;
}
