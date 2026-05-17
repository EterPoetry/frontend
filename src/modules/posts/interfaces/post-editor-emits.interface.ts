import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { Post } from '@/modules/posts/interfaces/post.interface';

export interface PostEditorEmits {
    (event: typeof PostsEvents.UPDATED, post: Post): void;
    (event: 'delete-draft'): void;
}
