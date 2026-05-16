import { PostComment } from '@/modules/posts/interfaces/post-comment.interface';

export interface CommentListResponse {
    items: PostComment[];
    total: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
}
