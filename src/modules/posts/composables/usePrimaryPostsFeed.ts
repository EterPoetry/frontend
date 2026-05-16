import { computed, onBeforeUnmount, onMounted, ref, unref, watch, type Ref } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { usePostsFeedLikes } from '@/modules/posts/composables/usePostsFeedLikes';
import { PrimaryPostsFeedKind } from '@/modules/posts/interfaces/primary-posts-feed-kind.type';
import {
    POPULAR_POSTS_LOAD_MORE_ROOT_MARGIN,
    POPULAR_POSTS_PAGE_LIMIT,
    POPULAR_SNAPSHOT_EXPIRED_ERROR_CODE,
} from '@/modules/posts/constants/popular-posts.constants';
import { usePostsStore } from '@/modules/posts/posts.store';
import { uk } from '@/shared/locales/uk';
import { getApiErrorResponse } from '@/shared/utils/api-error.utils';

export const usePrimaryPostsFeed = (kind: PrimaryPostsFeedKind | Ref<PrimaryPostsFeedKind>) => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();
    const player = usePostPlayer();

    const isInitialLoading = ref(false);
    const isLoadingMore = ref(false);
    const errorMessage = ref('');
    const loadMoreTrigger = ref<HTMLElement | null>(null);

    let observer: IntersectionObserver | null = null;

    const posts = computed({
        get: () => {
            const resolvedKind = unref(kind);

            if (resolvedKind === 'subscriptions') {
                return postsStore.subscriptionsPosts;
            }

            if (resolvedKind === 'favorites') {
                return postsStore.likedPosts;
            }

            return postsStore.popularPosts;
        },
        set: (value) => {
            const resolvedKind = unref(kind);

            if (resolvedKind === 'subscriptions') {
                postsStore.subscriptionsPosts = value;
                return;
            }

            if (resolvedKind === 'favorites') {
                postsStore.likedPosts = value;
                return;
            }

            postsStore.popularPosts = value;
        },
    });

    const canLoadMore = computed(() => {
        const resolvedKind = unref(kind);

        if (resolvedKind === 'subscriptions') {
            return postsStore.subscriptionsPostsHasMore;
        }

        if (resolvedKind === 'favorites') {
            return postsStore.likedPostsHasMore;
        }

        return postsStore.popularPostsHasMore;
    });

    const { likePendingPostIds, toggleLike } = usePostsFeedLikes(posts, {
        removeFromFeedOnUnlike: computed(() => unref(kind) === 'favorites'),
    });

    const resetFeedState = (): void => {
        const resolvedKind = unref(kind);

        if (resolvedKind === 'subscriptions') {
            postsStore.clearSubscriptionsPosts();
            return;
        }

        if (resolvedKind === 'favorites') {
            postsStore.clearLikedPosts();
            return;
        }

        postsStore.clearPopularPostsSnapshot();
    };

    const loadPosts = async (reset = false): Promise<void> => {
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
            const resolvedKind = unref(kind);

            if (resolvedKind === 'subscriptions') {
                await postsStore.getSubscriptionsPosts({
                    limit: POPULAR_POSTS_PAGE_LIMIT,
                    ...(reset ? {} : {
                        cursor: postsStore.subscriptionsPostsNextCursor ?? undefined,
                    }),
                });
            } else if (resolvedKind === 'favorites') {
                await postsStore.getLikedPosts({
                    limit: POPULAR_POSTS_PAGE_LIMIT,
                    offset: reset ? 0 : postsStore.likedPostsOffset,
                });
            } else {
                await postsStore.getPopularPosts({
                    limit: POPULAR_POSTS_PAGE_LIMIT,
                    ...(reset ? {} : {
                        snapshotId: postsStore.popularPostsSnapshotId ?? undefined,
                        cursor: postsStore.popularPostsNextCursor ?? undefined,
                    }),
                });
            }
        } catch (error) {
            const apiError = getApiErrorResponse(error);
            const resolvedKind = unref(kind);

            if (resolvedKind === 'popular' && apiError?.errorCode === POPULAR_SNAPSHOT_EXPIRED_ERROR_CODE) {
                resetFeedState();
                await loadPosts(true);
                return;
            }

            errorMessage.value = resolvedKind === 'subscriptions'
                ? uk.home.subscriptionsFeed.loadFailed
                : resolvedKind === 'favorites'
                    ? uk.home.favoritesFeed.loadFailed
                    : uk.home.popularFeed.loadFailed;
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

    const setupObserver = (): void => {
        if (observer) {
            observer.disconnect();
        }

        observer = new IntersectionObserver((entries) => {
            const [entry] = entries;

            if (!entry?.isIntersecting) {
                return;
            }

            void loadPosts(false);
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

    watch(() => unref(kind), () => {
        errorMessage.value = '';
        void loadPosts(true);
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

            void loadPosts(true);
        },
    );

    onMounted(() => {
        setupObserver();
        void loadPosts(true);
    });

    onBeforeUnmount(() => {
        observer?.disconnect();
    });

    return {
        activePostId: player.activePostId,
        canLoadMore,
        errorMessage,
        isInitialLoading,
        isLoadingMore,
        isPlaying: player.isPlaying,
        likePendingPostIds,
        loadMoreTrigger,
        posts,
        setActivePost,
        toggleLike,
    };
};
