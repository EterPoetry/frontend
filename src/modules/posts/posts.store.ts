import { defineStore } from 'pinia';
import api from '@/core/api';
import {
    POST_PROCESSING_POLL_INTERVAL_MS,
    POST_PROCESSING_TIMEOUT_MS,
} from '@/modules/posts/constants/post-processing.constants';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { EndPostListenPayload } from '@/modules/posts/interfaces/end-post-listen-payload.interface';
import { EndPostListenResponse } from '@/modules/posts/interfaces/end-post-listen-response.interface';
import { GetCategoriesQuery } from '@/modules/posts/interfaces/get-categories-query.interface';
import { GetPopularPostsQuery } from '@/modules/posts/interfaces/get-popular-posts-query.interface';
import { GetPopularPostsResponse } from '@/modules/posts/interfaces/get-popular-posts-response.interface';
import { DeletePostResponse } from '@/modules/posts/interfaces/delete-post-response.interface';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { PostListenSession } from '@/modules/posts/interfaces/post-listen-session.interface';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { PostsState } from '@/modules/posts/interfaces/posts-state.interface';
import { PublicConfig } from '@/modules/posts/interfaces/public-config.interface';
import { StartPostListenPayload } from '@/modules/posts/interfaces/start-post-listen-payload.interface';
import { StartPostListenResponse } from '@/modules/posts/interfaces/start-post-listen-response.interface';
import { UpdatePostPayload } from '@/modules/posts/interfaces/update-post-payload.interface';
import { UpdatePostListenProgressPayload } from '@/modules/posts/interfaces/update-post-listen-progress-payload.interface';
import { UpdatePostListenProgressResponse } from '@/modules/posts/interfaces/update-post-listen-progress-response.interface';
import { buildAudioFormData } from '@/modules/posts/utils/post-audio.utils';
import { sleep } from '@/shared/utils/time.utils';

export const usePostsStore = defineStore('posts', {
    state: (): PostsState => ({
        config: null,
        categories: [],
        currentPost: null,
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

            this.currentPost = response.data;

            return this.currentPost;
        },

        async getPopularPosts(query: GetPopularPostsQuery = {}): Promise<GetPopularPostsResponse> {
            const response = await api.get<GetPopularPostsResponse>('/posts/popular', {
                params: query,
            });

            this.popularPosts = response.data.items;
            this.popularPostsTotal = response.data.total;
            this.popularPostsSnapshotId = response.data.snapshotId;
            this.popularPostsSnapshotGeneratedAt = response.data.snapshotGeneratedAt;
            this.popularPostsNextCursor = response.data.nextCursor;
            this.popularPostsHasMore = response.data.hasMore;

            return response.data;
        },

        async likePost(postId: number): Promise<{ ok: boolean; likesCount: number }> {
            const response = await api.post<{ ok: boolean; likesCount: number }>(`/posts/${postId}/like`);

            return response.data;
        },

        async unlikePost(postId: number): Promise<{ ok: boolean; likesCount: number }> {
            const response = await api.delete<{ ok: boolean; likesCount: number }>(`/posts/${postId}/like`);

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

        async deletePost(postId: number): Promise<boolean> {
            const response = await api.delete<DeletePostResponse>(`/posts/${postId}`);

            if (response.data.ok && this.currentPost?.postId === postId) {
                this.currentPost = null;
            }

            return response.data.ok;
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
    },
});
