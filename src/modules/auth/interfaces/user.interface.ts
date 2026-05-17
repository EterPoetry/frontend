export interface User {
    userId: number;
    name: string;
    username: string;
    email: string;
    googleId: string | null;
    photo: string | null;
    bio?: string | null;
    link?: string | null;
    isPremium?: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    currentViolationsCount?: number;
    maxViolationsBeforeBlock?: number;
}
