export interface ProfileFollowListItem {
    userId: number;
    name: string;
    username: string;
    photo: string | null;
    isPremium: boolean;
    isSubscribed: boolean;
}
