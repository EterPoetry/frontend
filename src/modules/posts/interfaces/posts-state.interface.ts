import { PostComment } from '@/modules/posts/interfaces/post-comment.interface';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { PublicConfig } from '@/modules/posts/interfaces/public-config.interface';
import { PostListenSession } from '@/modules/posts/interfaces/post-listen-session.interface';

export interface PostsState {
    config: PublicConfig | null;
    categories: PostCategory[];
    currentPost: Post | null;
    comments: PostComment[];
    commentsTotal: number;
    commentsNextCursor: string | null;
    commentsHasMore: boolean;
    commentReplies: Record<number, PostComment[]>;
    commentRepliesTotal: Record<number, number>;
    commentRepliesNextCursor: Record<number, string | null>;
    commentRepliesHasMore: Record<number, boolean>;
    popularPosts: Post[];
    popularPostsTotal: number;
    popularPostsSnapshotId: number | null;
    popularPostsSnapshotGeneratedAt: string | null;
    popularPostsNextCursor: string | null;
    popularPostsHasMore: boolean;
    searchFeedPosts: Post[];
    searchFeedTotal: number;
    searchFeedOffset: number;
    searchFeedHasMore: boolean;
    currentListenSession: PostListenSession | null;
}
