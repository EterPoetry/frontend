import type { AdminRole } from '@/modules/admin/enums/admin-role.enum';

export interface AdminAccount {
    adminId: number;
    name: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
    inviteExpiresAt: string | null;
    createdAt: string;
}
