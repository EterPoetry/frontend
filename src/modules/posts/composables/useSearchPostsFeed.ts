import { computed, onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { usePostsFeedLikes } from '@/modules/posts/composables/usePostsFeedLikes';
import { usePostsStore } from '@/modules/posts/posts.store';
import {
    SEARCH_POSTS_LOAD_MORE_ROOT_MARGIN,
    SEARCH_POSTS_PAGE_LIMIT,
} from '@/modules/posts/constants/search-posts.constants';
import { uk } from '@/shared/locales/uk';

export const useSearchPostsFeed = (params: {
    search: Ref<string>;
    categoryId: Ref<number | null>;
    sortBy: Ref<string>;
}) => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();
    const player = usePostPlayer();

    const isInitialLoading = ref(false);
    const isLoadingMore = ref(false);
    const errorMessage = ref('');
    const loadMoreTrigger = ref<HTMLElement | null>(null);

    let observer: IntersectionObserver | null = null;
    let requestSequence = 0;

    const posts = computed({
        get: () => postsStore.searchFeedPosts,
        set: (value) => {
            postsStore.searchFeedPosts = value;
        },
    });
    const shouldLoadSearchFeed = computed(() => params.search.value.trim() !== '' || params.categoryId.value !== null);
    const canLoadMore = computed(() => shouldLoadSearchFeed.value && postsStore.searchFeedHasMore);
    const { likePendingPostIds, toggleLike } = usePostsFeedLikes(posts);

    const resetState = (): void => {
        postsStore.clearSearchPosts();
    };

    const loadSearchPosts = async (reset = false): Promise<void> => {
        const requestId = ++requestSequence;
        const shouldKeepVisiblePosts = reset && posts.value.length > 0;

        if (reset) {
            isInitialLoading.value = !shouldKeepVisiblePosts;
            errorMessage.value = '';
            if (!shouldKeepVisiblePosts) {
                resetState();
            }
        } else {
            if (isInitialLoading.value || isLoadingMore.value || !canLoadMore.value) {
                return;
            }
            isLoadingMore.value = true;
        }

        try {
            const searchQuery = params.search.value.trim();
            await postsStore.searchPosts({
                ...(searchQuery ? { search: searchQuery } : {}),
                ...(params.categoryId.value !== null ? { categoryId: params.categoryId.value } : {}),
                sortBy: params.sortBy.value as 'newest' | 'oldest' | 'popular',
                offset: reset ? 0 : postsStore.searchFeedPosts.length,
                limit: SEARCH_POSTS_PAGE_LIMIT,
            });

            if (requestId !== requestSequence) {
                return;
            }

        } catch (_error) {
            if (requestId !== requestSequence) {
                return;
            }

            if (reset && !shouldKeepVisiblePosts) {
                resetState();
            }
            errorMessage.value = uk.home.searchFeed.loadFailed;
        } finally {
            if (requestId !== requestSequence) {
                return;
            }

            isInitialLoading.value = false;
            isLoadingMore.value = false;
        }
    };

    const retry = async (): Promise<void> => {
        await loadSearchPosts(true);
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

            void loadSearchPosts(false);
        }, {
            rootMargin: SEARCH_POSTS_LOAD_MORE_ROOT_MARGIN,
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
        [() => params.search.value, () => params.categoryId.value, () => params.sortBy.value],
        () => {
            if (!shouldLoadSearchFeed.value) {
                resetState();
                errorMessage.value = '';
                isInitialLoading.value = false;
                isLoadingMore.value = false;
                return;
            }

            void loadSearchPosts(true);
        },
    );

    watch(
        [() => authStore.isInitialized, () => authStore.token],
        ([isInitialized, token], [prevIsInitialized, prevToken]) => {
            if (!isInitialized || !token || (prevIsInitialized === isInitialized && prevToken === token)) {
                return;
            }

            if (shouldLoadSearchFeed.value) {
                void loadSearchPosts(true);
            }
        },
    );

    onMounted(() => {
        setupObserver();

        if (shouldLoadSearchFeed.value) {
            void loadSearchPosts(true);
        }
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
        retry,
        setActivePost,
        toggleLike,
    };
};
