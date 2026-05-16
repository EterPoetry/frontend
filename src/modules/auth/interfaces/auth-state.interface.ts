import { User } from './user.interface';

export interface AuthState {
    token: string | null;
    user: User | null;
    isInitialized: boolean;
}
