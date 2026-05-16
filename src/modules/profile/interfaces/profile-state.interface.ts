import { PublicProfile } from '@/modules/profile/interfaces/public-profile.interface';

export interface ProfileState {
    profilesById: Record<number, PublicProfile>;
}
