import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { PublicConfig } from '@/modules/posts/interfaces/public-config.interface';

export interface PostsState {
    config: PublicConfig | null;
    categories: PostCategory[];
    currentPost: Post | null;
}
