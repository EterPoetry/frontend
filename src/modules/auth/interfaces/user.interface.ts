export interface User {
    userId: number;
    name: string;
    email: string;
    googleId: string | null;
    photo: string | null;
    isEmailVerified: boolean;
    createdAt: string;
}