import { PostAuthor } from '@/modules/posts/interfaces/post.interface';

export interface PostComment {
    commentId: number;
    postId: number;
    commentText: string;
    replyToCommentId: number | null;
    repliesCount: number;
    likesCount: number;
    isLiked: boolean;
    isLikedByAuthor: boolean;
    author: PostAuthor;
    createdAt?: string;
    updatedAt?: string;
}
