import type { AdminUserViolation } from '@/modules/admin/interfaces/admin-user-violation.interface';

export interface AdminUserDetail {
    userId: number;
    name: string;
    username: string;
    email: string;
    createdAt: string;
    blockedAt: string | null;
    postsCount: number;
    activeViolationsCount: number;
    violations: AdminUserViolation[];
}
