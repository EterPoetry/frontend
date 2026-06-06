import type { AdminAccount } from '@/modules/admin/interfaces/admin-account.interface';

export interface AdminAuthResponse {
    admin: AdminAccount;
    accessToken: string;
}
