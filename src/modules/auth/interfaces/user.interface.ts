export interface User {
    userId: number;
    name: string;
    username: string;
    email: string;
    googleId: string | null;
    photo: string | null;
    isPremium?: boolean;
    isEmailVerified: boolean;
    createdAt: string;
}
