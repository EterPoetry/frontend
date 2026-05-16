import { Post } from '@/modules/posts/interfaces/post.interface';

export interface GetFeedPostsResponse {
    items: Post[];
    nextCursor: string | null;
    hasMore: boolean;
}
