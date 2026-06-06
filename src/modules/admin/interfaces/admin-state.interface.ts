import type { AdminAccount } from '@/modules/admin/interfaces/admin-account.interface';

export interface AdminState {
    token: string | null;
    admin: AdminAccount | null;
    isInitialized: boolean;
}
