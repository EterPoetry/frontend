export interface PublicProfile {
    userId: number;
    name: string;
    username: string;
    photo: string | null;
    bio?: string | null;
    link?: string | null;
    isPremium: boolean;
    isSubscribed: boolean;
    createdAt: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
}
