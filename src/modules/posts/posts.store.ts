import { defineStore } from 'pinia';
import api from '@/core/api';
import {
    POST_PROCESSING_POLL_INTERVAL_MS,
    POST_PROCESSING_TIMEOUT_MS,
} from '@/modules/posts/constants/post-processing.constants';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { CommentListQuery } from '@/modules/posts/interfaces/comment-list-query.interface';
import { CommentListResponse } from '@/modules/posts/interfaces/comment-list-response.interface';
import { CreateCommentPayload } from '@/modules/posts/interfaces/create-comment-payload.interface';
import { DeleteCommentResponse } from '@/modules/posts/interfaces/delete-comment-response.interface';
import { EndPostListenPayload } from '@/modules/posts/interfaces/end-post-listen-payload.interface';
import { EndPostListenResponse } from '@/modules/posts/interfaces/end-post-listen-response.interface';
import { GetCategoriesQuery } from '@/modules/posts/interfaces/get-categories-query.interface';
import { GetPopularPostsQuery } from '@/modules/posts/interfaces/get-popular-posts-query.interface';
import { GetPopularPostsResponse } from '@/modules/posts/interfaces/get-popular-posts-response.interface';
import { DeletePostResponse } from '@/modules/posts/interfaces/delete-post-response.interface';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { PostComment } from '@/modules/posts/interfaces/post-comment.interface';
import { PostListenSession } from '@/modules/posts/interfaces/post-listen-session.interface';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { PostsState } from '@/modules/posts/interfaces/posts-state.interface';
import { PublicConfig } from '@/modules/posts/interfaces/public-config.interface';
import { StartPostListenPayload } from '@/modules/posts/interfaces/start-post-listen-payload.interface';
import { StartPostListenResponse } from '@/modules/posts/interfaces/start-post-listen-response.interface';
import { ToggleLikeResponse } from '@/modules/posts/interfaces/toggle-like-response.interface';
import { UpdatePostPayload } from '@/modules/posts/interfaces/update-post-payload.interface';
import { UpdatePostListenProgressPayload } from '@/modules/posts/interfaces/update-post-listen-progress-payload.interface';
import { UpdatePostListenProgressResponse } from '@/modules/posts/interfaces/update-post-listen-progress-response.interface';
import { UpdatePostTextSynchronizationPayload } from '@/modules/posts/interfaces/update-post-text-synchronization-payload.interface';
import { buildAudioFormData } from '@/modules/posts/utils/post-audio.utils';
import { applyRememberedPostLikeState, rememberPostLikeState } from '@/modules/posts/utils/post-like-state.utils';
import { sleep } from '@/shared/utils/time.utils';

const updateCommentLikeInList = (
    comments: PostComment[],
    commentId: number,
    isLiked: boolean,
    likesCount?: number,
    isLikedByAuthor?: boolean,
): PostComment[] => comments.map((comment) => comment.commentId === commentId
    ? {
        ...comment,
        isLiked,
        likesCount: likesCount ?? Math.max(0, comment.likesCount + (isLiked ? 1 : -1)),
        ...(typeof isLikedByAuthor === 'boolean' ? { isLikedByAuthor } : {}),
    }
    : comment);

const omitReplyBucket = <T>(collection: Record<number, T>, key: number): Record<number, T> => {
    const nextCollection = { ...collection };
    delete nextCollection[key];

    return nextCollection;
};

export const usePostsStore = defineStore('posts', {
    state: (): PostsState => ({
        config: null,
        categories: [],
        currentPost: null,
        comments: [],
        commentsTotal: 0,
        commentsNextCursor: null,
        commentsHasMore: false,
        commentReplies: {},
        commentRepliesTotal: {},
        commentRepliesNextCursor: {},
        commentRepliesHasMore: {},
        popularPosts: [],
        popularPostsTotal: 0,
        popularPostsSnapshotId: null,
        popularPostsSnapshotGeneratedAt: null,
        popularPostsNextCursor: null,
        popularPostsHasMore: false,
        currentListenSession: null,
    }),

    actions: {
        async getConfig(): Promise<PublicConfig> {
            const response = await api.get<PublicConfig>('/config');
            this.config = response.data;

            return this.config;
        },

        async getCategories(query: GetCategoriesQuery = {}): Promise<PostCategory[]> {
            const response = await api.get<PostCategory[]>('/posts/categories', {
                params: query,
            });

            this.categories = response.data;

            return this.categories;
        },

        async createPost(audio: Blob): Promise<Post> {
            const response = await api.post<Post>('/posts', buildAudioFormData(audio), {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            this.currentPost = response.data;

            return this.currentPost;
        },

        async getPost(postId: number): Promise<Post> {
            const response = await api.get<Post>(`/posts/${postId}`);

            this.currentPost = applyRememberedPostLikeState(response.data);

            return this.currentPost;
        },

        async fetchPost(postId: number): Promise<Post> {
            const response = await api.get<Post>(`/posts/${postId}`);

            return applyRememberedPostLikeState(response.data);
        },

        async getPostComments(postId: number, query: CommentListQuery = {}): Promise<CommentListResponse> {
            const response = await api.get<CommentListResponse>(`/posts/${postId}/comments`, {
                params: query,
            });

            this.comments = query.cursor
                ? [...this.comments, ...response.data.items]
                : response.data.items;
            this.commentsTotal = response.data.total;
            this.commentsNextCursor = response.data.nextCursor;
            this.commentsHasMore = response.data.hasMore;

            return response.data;
        },

        async getCommentReplies(commentId: number, query: CommentListQuery = {}): Promise<CommentListResponse> {
            const response = await api.get<CommentListResponse>(`/posts/comments/${commentId}/replies`, {
                params: query,
            });
            const existingReplies = this.commentReplies[commentId] ?? [];

            this.commentReplies = {
                ...this.commentReplies,
                [commentId]: query.cursor
                    ? [...existingReplies, ...response.data.items]
                    : response.data.items,
            };
            this.commentRepliesTotal = {
                ...this.commentRepliesTotal,
                [commentId]: response.data.total,
            };
            this.commentRepliesNextCursor = {
                ...this.commentRepliesNextCursor,
                [commentId]: response.data.nextCursor,
            };
            this.commentRepliesHasMore = {
                ...this.commentRepliesHasMore,
                [commentId]: response.data.hasMore,
            };

            return response.data;
        },

        async getPopularPosts(query: GetPopularPostsQuery = {}): Promise<GetPopularPostsResponse> {
            const response = await api.get<GetPopularPostsResponse>('/posts/popular', {
                params: query,
            });

            this.popularPosts = response.data.items.map(applyRememberedPostLikeState);
            this.popularPostsTotal = response.data.total;
            this.popularPostsSnapshotId = response.data.snapshotId;
            this.popularPostsSnapshotGeneratedAt = response.data.snapshotGeneratedAt;
            this.popularPostsNextCursor = response.data.nextCursor;
            this.popularPostsHasMore = response.data.hasMore;

            return {
                ...response.data,
                items: this.popularPosts,
            };
        },

        async likePost(postId: number): Promise<{ ok: boolean; likesCount: number }> {
            const response = await api.post<{ ok: boolean; likesCount: number }>(`/posts/${postId}/like`);

            rememberPostLikeState(postId, true);

            return response.data;
        },

        async unlikePost(postId: number): Promise<{ ok: boolean; likesCount: number }> {
            const response = await api.delete<{ ok: boolean; likesCount: number }>(`/posts/${postId}/like`);

            rememberPostLikeState(postId, false);

            return response.data;
        },

        async fetchPostLikeState(postId: number): Promise<{ isLiked: boolean; likesCount?: number } | null> {
            try {
                const response = await api.get<{ isLiked: boolean; likesCount?: number }>(`/posts/${postId}/like`);

                rememberPostLikeState(postId, response.data.isLiked);

                return response.data;
            } catch (_error) {
                return null;
            }
        },

        async createComment(postId: number, payload: CreateCommentPayload): Promise<PostComment> {
            const response = await api.post<PostComment>(`/posts/${postId}/comments`, payload);
            const nextComment = response.data;

            if (nextComment.replyToCommentId === null) {
                this.comments = [nextComment, ...this.comments];
                this.commentsTotal += 1;
            } else {
                const parentCommentId = nextComment.replyToCommentId;
                const existingReplies = this.commentReplies[parentCommentId] ?? [];

                this.commentReplies = {
                    ...this.commentReplies,
                    [parentCommentId]: [...existingReplies, nextComment],
                };
                this.commentRepliesTotal = {
                    ...this.commentRepliesTotal,
                    [parentCommentId]: (this.commentRepliesTotal[parentCommentId] ?? existingReplies.length) + 1,
                };
                this.comments = this.comments.map((comment) => comment.commentId === parentCommentId
                    ? { ...comment, repliesCount: comment.repliesCount + 1 }
                    : comment);
            }

            if (this.currentPost?.postId === postId) {
                this.currentPost = {
                    ...this.currentPost,
                    commentsCount: this.currentPost.commentsCount + 1,
                };
            }

            return nextComment;
        },

        async likeComment(commentId: number): Promise<ToggleLikeResponse> {
            const response = await api.post<ToggleLikeResponse>(`/posts/comments/${commentId}/like`);

            return response.data;
        },

        async unlikeComment(commentId: number): Promise<ToggleLikeResponse> {
            const response = await api.delete<ToggleLikeResponse>(`/posts/comments/${commentId}/like`);

            return response.data;
        },

        clearPopularPostsSnapshot(): void {
            this.popularPosts = [];
            this.popularPostsTotal = 0;
            this.popularPostsSnapshotId = null;
            this.popularPostsSnapshotGeneratedAt = null;
            this.popularPostsNextCursor = null;
            this.popularPostsHasMore = false;
        },

        clearPostComments(): void {
            this.comments = [];
            this.commentsTotal = 0;
            this.commentsNextCursor = null;
            this.commentsHasMore = false;
            this.commentReplies = {};
            this.commentRepliesTotal = {};
            this.commentRepliesNextCursor = {};
            this.commentRepliesHasMore = {};
        },

        async waitForPostProcessing(
            postId: number,
            intervalMs = POST_PROCESSING_POLL_INTERVAL_MS,
            timeoutMs = POST_PROCESSING_TIMEOUT_MS,
        ): Promise<Post> {
            const startTime = Date.now();
            let post = await this.getPost(postId);

            while (post.status === PostStatus.PROCESSING) {
                if (Date.now() - startTime >= timeoutMs) {
                    throw new Error('Post processing timeout exceeded.');
                }

                await sleep(intervalMs);
                post = await this.getPost(postId);
            }

            return post;
        },

        async updatePost(postId: number, payload: UpdatePostPayload): Promise<Post> {
            const response = await api.patch<Post>(`/posts/${postId}`, payload);

            this.currentPost = response.data;

            return this.currentPost;
        },

        async replacePostAudio(postId: number, audio: Blob): Promise<Post> {
            const response = await api.patch<Post>(`/posts/${postId}/audio`, buildAudioFormData(audio), {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            this.currentPost = response.data;

            return this.currentPost;
        },

        async updatePostTextSynchronization(
            postId: number,
            payload: UpdatePostTextSynchronizationPayload,
        ): Promise<Post> {
            const response = await api.patch<Post>(`/posts/${postId}/text-synchronization`, payload);

            this.currentPost = response.data;

            return this.currentPost;
        },

        async deletePost(postId: number): Promise<boolean> {
            const response = await api.delete<DeletePostResponse>(`/posts/${postId}`);

            if (response.data.ok && this.currentPost?.postId === postId) {
                this.currentPost = null;
            }

            return response.data.ok;
        },

        async deleteComment(commentId: number): Promise<boolean> {
            const topLevelComment = this.comments.find((comment) => comment.commentId === commentId) ?? null;
            const replyEntry = Object.entries(this.commentReplies).find(([, replies]) => replies
                .some((comment) => comment.commentId === commentId)) ?? null;
            const replyParentId = replyEntry ? Number(replyEntry[0]) : null;
            const replyComment = replyEntry?.[1].find((comment) => comment.commentId === commentId) ?? null;
            const affectedPostId = topLevelComment?.postId ?? replyComment?.postId ?? null;

            const response = await api.delete<DeleteCommentResponse>(`/posts/comments/${commentId}`);

            if (!response.data.ok) {
                return false;
            }

            if (topLevelComment) {
                this.comments = this.comments.filter((comment) => comment.commentId !== commentId);
                this.commentsTotal = Math.max(0, this.commentsTotal - 1);
                this.commentReplies = omitReplyBucket(this.commentReplies, commentId);
                this.commentRepliesTotal = omitReplyBucket(this.commentRepliesTotal, commentId);
                this.commentRepliesNextCursor = omitReplyBucket(this.commentRepliesNextCursor, commentId);
                this.commentRepliesHasMore = omitReplyBucket(this.commentRepliesHasMore, commentId);
            } else if (replyEntry && replyParentId !== null) {
                const replies = replyEntry[1];

                this.commentReplies = {
                    ...this.commentReplies,
                    [replyParentId]: replies.filter((comment) => comment.commentId !== commentId),
                };
                this.commentRepliesTotal = {
                    ...this.commentRepliesTotal,
                    [replyParentId]: Math.max(0, (this.commentRepliesTotal[replyParentId] ?? replies.length) - 1),
                };
                this.comments = this.comments.map((comment) => comment.commentId === replyParentId
                    ? { ...comment, repliesCount: Math.max(0, comment.repliesCount - 1) }
                    : comment);
            }

            if (affectedPostId !== null && this.currentPost?.postId === affectedPostId) {
                await this.getPost(affectedPostId);
            }

            return true;
        },

        async startListen(postId: number, payload: StartPostListenPayload): Promise<PostListenSession> {
            const response = await api.post<StartPostListenResponse>(`/posts/${postId}/listen/start`, payload);

            this.currentListenSession = {
                postId,
                sessionId: payload.sessionId,
                token: response.data.token,
                listenedMs: response.data.listenedMs,
                trackDurationMs: response.data.trackDurationMs,
                isSuspicious: response.data.isSuspicious,
            };

            return this.currentListenSession;
        },

        async updateListenProgress(
            postId: number,
            payload: UpdatePostListenProgressPayload,
        ): Promise<UpdatePostListenProgressResponse> {
            const response = await api.post<UpdatePostListenProgressResponse>(`/posts/${postId}/listen/progress`, payload);

            if (this.currentListenSession?.token === payload.token) {
                this.currentListenSession = {
                    ...this.currentListenSession,
                    listenedMs: response.data.listenedMs,
                    isSuspicious: response.data.isSuspicious,
                };
            }

            return response.data;
        },

        async endListen(postId: number, payload: EndPostListenPayload): Promise<EndPostListenResponse> {
            const response = await api.post<EndPostListenResponse>(`/posts/${postId}/listen/end`, payload);

            if (this.currentListenSession?.token === payload.token) {
                this.currentListenSession = null;
            }

            return response.data;
        },

        clearCurrentListenSession(): void {
            this.currentListenSession = null;
        },

        incrementPostListens(postId: number): void {
            this.popularPosts = this.popularPosts.map((post) => post.postId === postId
                ? { ...post, listens: post.listens + 1 }
                : post);

            if (this.currentPost?.postId === postId) {
                this.currentPost = {
                    ...this.currentPost,
                    listens: this.currentPost.listens + 1,
                };
            }
        },

        applyPostLikeState(postId: number, isLiked: boolean, likesCount?: number): void {
            this.popularPosts = this.popularPosts.map((post) => post.postId === postId
                ? {
                    ...post,
                    isLiked,
                    likesCount: likesCount ?? Math.max(0, post.likesCount + (isLiked ? 1 : -1)),
                }
                : post);

            if (this.currentPost?.postId === postId) {
                this.currentPost = {
                    ...this.currentPost,
                    isLiked,
                    likesCount: likesCount ?? Math.max(0, this.currentPost.likesCount + (isLiked ? 1 : -1)),
                };
            }
        },

        applyCommentLikeState(commentId: number, isLiked: boolean, likesCount?: number, isLikedByAuthor?: boolean): void {
            this.comments = updateCommentLikeInList(this.comments, commentId, isLiked, likesCount, isLikedByAuthor);
            this.commentReplies = Object.fromEntries(
                Object.entries(this.commentReplies).map(([parentCommentId, replies]) => [
                    Number(parentCommentId),
                    updateCommentLikeInList(replies, commentId, isLiked, likesCount, isLikedByAuthor),
                ]),
            );
        },
    },
});
