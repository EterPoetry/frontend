import { defineStore } from 'pinia';
import api from '@/core/api';
import {
    POST_PROCESSING_POLL_INTERVAL_MS,
    POST_PROCESSING_TIMEOUT_MS,
} from '@/modules/posts/constants/post-processing.constants';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { GetCategoriesQuery } from '@/modules/posts/interfaces/get-categories-query.interface';
import { DeletePostResponse } from '@/modules/posts/interfaces/delete-post-response.interface';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { PostsState } from '@/modules/posts/interfaces/posts-state.interface';
import { PublicConfig } from '@/modules/posts/interfaces/public-config.interface';
import { UpdatePostPayload } from '@/modules/posts/interfaces/update-post-payload.interface';
import { buildAudioFormData } from '@/modules/posts/utils/post-audio.utils';
import { sleep } from '@/shared/utils/time.utils';

export const usePostsStore = defineStore('posts', {
    state: (): PostsState => ({
        config: null,
        categories: [],
        currentPost: null,
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
    },
});
