import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { PublicConfig } from '@/modules/posts/interfaces/public-config.interface';
import { PostListenSession } from '@/modules/posts/interfaces/post-listen-session.interface';

export interface PostsState {
    config: PublicConfig | null;
    categories: PostCategory[];
    currentPost: Post | null;
    popularPosts: Post[];
    popularPostsTotal: number;
    popularPostsSnapshotId: number | null;
    popularPostsSnapshotGeneratedAt: string | null;
    popularPostsNextCursor: string | null;
    popularPostsHasMore: boolean;
    currentListenSession: PostListenSession | null;
}
