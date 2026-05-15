import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';

export interface PostAuthor {
    userId: number;
    name: string;
    username: string;
    photo: string | null;
    isPremium: boolean;
}

export interface PostTextSynchronizationItem {
    lineIndex: number;
    audioStartMomentMs: number;
}

export interface Post {
    postId: number;
    title: string | null;
    description: string | null;
    text: string | null;
    audioFileName: string | null;
    audioFileUrl: string | null;
    audioDurationSeconds: number | null;
    status: PostStatus;
    listens: number;
    likesCount: number;
    isLiked: boolean;
    commentsCount: number;
    originAuthorName: string | null;
    textSynchronization?: PostTextSynchronizationItem[];
    categories: PostCategory[];
    authorId: number;
    author: PostAuthor;
    createdAt: string;
    updatedAt: string;
}
