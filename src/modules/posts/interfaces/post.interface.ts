import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import type { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import type { PostAuthor } from '@/modules/posts/interfaces/post-author.interface';
import type { PostTextSynchronizationItem } from '@/modules/posts/interfaces/post-text-synchronization-item.interface';

export interface Post {
    postId: number;
    slug: string;
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
    textSynchronization: PostTextSynchronizationItem[];
    categories: PostCategory[];
    authorId: number;
    author: PostAuthor;
    createdAt: string;
    updatedAt: string;
}
