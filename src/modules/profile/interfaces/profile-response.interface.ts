export interface ProfileResponse {
    userId: number;
    name: string;
    username: string;
    email: string;
    photo: string | null;
    bio?: string | null;
    link?: string | null;
    isEmailVerified: boolean;
    isPremium: boolean;
    createdAt: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    currentViolationsCount: number;
    maxViolationsBeforeBlock: number;
}
