import { Post } from '@/modules/posts/interfaces/post.interface';

export interface PostsListProps {
    posts: Post[];
    activePostId: number | null;
    isPlaying: boolean;
    likePendingPostIds?: number[];
}
