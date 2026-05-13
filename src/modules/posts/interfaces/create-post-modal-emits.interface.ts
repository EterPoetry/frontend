import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { Post } from '@/modules/posts/interfaces/post.interface';

export interface CreatePostModalEmits {
    (event: typeof PostsEvents.CLOSE): void;
    (event: typeof PostsEvents.CREATED, post: Post): void;
}
