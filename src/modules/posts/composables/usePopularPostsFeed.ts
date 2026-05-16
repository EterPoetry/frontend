import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';
import {
    POPULAR_POSTS_PAGE_LIMIT,
    POPULAR_POSTS_LOAD_MORE_ROOT_MARGIN,
    POPULAR_SNAPSHOT_EXPIRED_ERROR_CODE,
} from '@/modules/posts/constants/popular-posts.constants';
import { uk } from '@/shared/locales/uk';
import { getApiErrorResponse } from '@/shared/utils/api-error.utils';

export const usePopularPostsFeed = () => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();
    const player = usePostPlayer();
    const router = useRouter();

    const posts = ref<Post[]>([]);
    const isInitialLoading = ref(false);
    const isLoadingMore = ref(false);
    const errorMessage = ref('');
    const total = ref(0);
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    const likePendingPostIds = ref<number[]>([]);

    let observer: IntersectionObserver | null = null;

    const canLoadMore = computed(() => postsStore.popularPostsHasMore && postsStore.popularPostsNextCursor !== null);

    const resetFeedState = (): void => {
        posts.value = [];
        total.value = 0;
        postsStore.clearPopularPostsSnapshot();
    };

    const loadPopularPosts = async (reset = false): Promise<void> => {
        if (reset) {
            isInitialLoading.value = true;
            errorMessage.value = '';
            resetFeedState();
        } else {
            if (isInitialLoading.value || isLoadingMore.value || !canLoadMore.value) {
                return;
            }

            isLoadingMore.value = true;
        }

        try {
            const response = await postsStore.getPopularPosts({
                limit: POPULAR_POSTS_PAGE_LIMIT,
                ...(reset ? {} : {
                    snapshotId: postsStore.popularPostsSnapshotId ?? undefined,
                    cursor: postsStore.popularPostsNextCursor ?? undefined,
                }),
            });

            total.value = response.total;
            posts.value = reset
                ? response.items
                : [...posts.value, ...response.items];
        } catch (error) {
            const apiError = getApiErrorResponse(error);

            if (apiError?.errorCode === POPULAR_SNAPSHOT_EXPIRED_ERROR_CODE) {
                resetFeedState();
                await loadPopularPosts(true);
                return;
            }

            errorMessage.value = uk.home.popularFeed.loadFailed;
        } finally {
            isInitialLoading.value = false;
            isLoadingMore.value = false;
        }
    };

    const setActivePost = async (postId: number): Promise<void> => {
        const nextPost = posts.value.find((post) => post.postId === postId);

        if (!nextPost?.audioFileUrl) {
            return;
        }

        try {
            const freshPost = await postsStore.getPost(postId);

            if (!freshPost.audioFileUrl) {
                return;
            }

            await player.togglePostPlayback(freshPost);
        } catch (_error) {
            await player.togglePostPlayback(nextPost);
        }
    };

    const retry = async (): Promise<void> => {
        await loadPopularPosts(true);
    };

    const applyLocalLikeState = (postId: number, isLiked: boolean, likesCount?: number): void => {
        posts.value = posts.value.map((post) => post.postId === postId
            ? {
                ...post,
                isLiked,
                likesCount: likesCount ?? Math.max(0, post.likesCount + (isLiked ? 1 : -1)),
            }
            : post);

        const updatedPost = posts.value.find((post) => post.postId === postId);

        if (updatedPost) {
            player.syncActivePost(updatedPost);
        } else if (player.activePost.value?.postId === postId) {
            player.syncActivePost({
                ...player.activePost.value,
                isLiked,
                likesCount: likesCount ?? Math.max(0, player.activePost.value.likesCount + (isLiked ? 1 : -1)),
            });
        }
    };

    const toggleLike = async (postId: number): Promise<void> => {
        if (!authStore.isAuthenticated) {
            await router.push({ name: AuthRouteNames.LOGIN });
            return;
        }

        const targetPost = posts.value.find((post) => post.postId === postId) ?? player.activePost.value;

        if (!targetPost || likePendingPostIds.value.includes(postId)) {
            return;
        }

        const nextIsLiked = !targetPost.isLiked;
        const previousIsLiked = targetPost.isLiked;
        const previousLikesCount = targetPost.likesCount;

        likePendingPostIds.value = [...likePendingPostIds.value, postId];
        applyLocalLikeState(postId, nextIsLiked, previousLikesCount);
        postsStore.applyPostLikeState(postId, nextIsLiked, previousLikesCount);

        try {
            const result = nextIsLiked
                ? await postsStore.likePost(postId)
                : await postsStore.unlikePost(postId);

            applyLocalLikeState(postId, nextIsLiked, result.likesCount);
            postsStore.applyPostLikeState(postId, nextIsLiked, result.likesCount);
        } catch (_error) {
            applyLocalLikeState(postId, previousIsLiked, previousLikesCount);
            postsStore.applyPostLikeState(postId, previousIsLiked, previousLikesCount);
        } finally {
            likePendingPostIds.value = likePendingPostIds.value.filter((pendingPostId) => pendingPostId !== postId);
        }
    };

    const setupObserver = (): void => {
        if (observer) {
            observer.disconnect();
        }

        observer = new IntersectionObserver((entries) => {
            const [entry] = entries;

            if (!entry?.isIntersecting) {
                return;
            }

            void loadPopularPosts(false);
        }, {
            rootMargin: POPULAR_POSTS_LOAD_MORE_ROOT_MARGIN,
        });

        if (loadMoreTrigger.value) {
            observer.observe(loadMoreTrigger.value);
        }
    };

    watch(loadMoreTrigger, () => {
        setupObserver();
    });

    watch(() => player.countedListenVersion.value, () => {
        const countedPostId = player.lastCountedPostId.value;

        if (!countedPostId) {
            return;
        }

        posts.value = posts.value.map((post) => post.postId === countedPostId
            ? { ...post, listens: post.listens + 1 }
            : post);
    });

    watch(
        [() => authStore.isInitialized, () => authStore.token],
        ([isInitialized, token], [prevIsInitialized, prevToken]) => {
            if (!isInitialized || !token || (prevIsInitialized === isInitialized && prevToken === token)) {
                return;
            }

            void loadPopularPosts(true);
        },
    );

    onMounted(() => {
        setupObserver();
        void loadPopularPosts(true);
    });

    onBeforeUnmount(() => {
        observer?.disconnect();
    });

    return {
        activePostId: player.activePostId,
        canLoadMore,
        errorMessage,
        isInitialLoading,
        isPlaying: player.isPlaying,
        likePendingPostIds,
        isLoadingMore,
        loadMoreTrigger,
        posts,
        retry,
        setActivePost,
        toggleLike,
    };
};
