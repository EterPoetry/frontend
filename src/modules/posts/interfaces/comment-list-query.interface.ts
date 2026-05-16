import { CommentSortOrder } from '@/modules/posts/enums/comment-sort-order.enum';

export interface CommentListQuery {
    cursor?: string;
    limit?: number;
    sort?: CommentSortOrder;
}
