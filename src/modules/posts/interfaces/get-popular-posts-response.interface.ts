import { Post } from '@/modules/posts/interfaces/post.interface';

export interface GetPopularPostsResponse {
    items: Post[];
    snapshotId: number;
    snapshotGeneratedAt: string;
    total: number;
    nextCursor: string | null;
    hasMore: boolean;
}
