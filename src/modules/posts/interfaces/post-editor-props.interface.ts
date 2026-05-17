import { Post } from '@/modules/posts/interfaces/post.interface';

export interface PostEditorProps {
    post: Post;
    isDeleteDraftPending?: boolean;
}
