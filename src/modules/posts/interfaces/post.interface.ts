import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';

export interface Post {
    postId: number;
    title: string | null;
    description: string | null;
    text: string | null;
    audioFileName: string | null;
    audioFileUrl: string | null;
    status: PostStatus;
    listens: number;
    originAuthorName: string | null;
    categories: PostCategory[];
    authorId: number;
    createdAt: string;
    updatedAt: string;
}
