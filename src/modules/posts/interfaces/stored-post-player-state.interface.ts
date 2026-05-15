import { Post } from '@/modules/posts/interfaces/post.interface';

export interface StoredPostPlayerState {
    post: Post;
    currentTimeSeconds: number;
    volume: number;
    isMuted: boolean;
}
