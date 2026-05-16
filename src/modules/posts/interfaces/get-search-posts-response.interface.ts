import { Post } from '@/modules/posts/interfaces/post.interface';

export interface GetSearchPostsResponse {
    items: Post[];
    total: number;
    offset: number;
}
