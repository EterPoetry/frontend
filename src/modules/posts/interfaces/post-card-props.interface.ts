import { Post } from '@/modules/posts/interfaces/post.interface';

export interface PostCardProps {
    post: Post;
    isActive?: boolean;
    isPlaying?: boolean;
    likePending?: boolean;
}
