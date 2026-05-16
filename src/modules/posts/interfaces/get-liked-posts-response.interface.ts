import { Post } from '@/modules/posts/interfaces/post.interface';

export interface GetLikedPostsResponse {
    items: Post[];
    total: number;
    offset: number;
}
