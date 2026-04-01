import { AuthEvents } from '@/modules/auth/enums/auth-events.enum';
import { AuthData } from '@/modules/auth/interfaces/auth-data.interface.ts';

export interface RegisterEmits {
    (event: typeof AuthEvents.REGISTER, data: AuthData): void;
}