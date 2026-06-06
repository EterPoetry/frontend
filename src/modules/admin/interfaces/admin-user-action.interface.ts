import type { AdminUserDetail } from '@/modules/admin/interfaces/admin-user-detail.interface';
import type { AdminUserViolation } from '@/modules/admin/interfaces/admin-user-violation.interface';

export type AdminUserAction =
    | { kind: 'block'; user: AdminUserDetail }
    | { kind: 'unblock'; user: AdminUserDetail }
    | { kind: 'removeViolation'; user: AdminUserDetail; violation: AdminUserViolation };
