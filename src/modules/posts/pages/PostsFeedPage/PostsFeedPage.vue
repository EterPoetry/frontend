<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import PostsFeedSection from '@/modules/posts/components/PostsFeedSection/PostsFeedSection.vue';
import { usePrimaryPostsFeed } from '@/modules/posts/composables/usePrimaryPostsFeed';
import { PrimaryPostsFeedKind } from '@/modules/posts/interfaces/primary-posts-feed-kind.type';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import { useSearchPostsFeed } from '@/modules/posts/composables/useSearchPostsFeed';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import { AppNavigationItem } from '@/shared/constants/app-navigation';
import { uk } from '@/shared/locales/uk';
import './PostsFeedPage.css';

const SEARCH_INPUT_DEBOUNCE_MS = 300;

const {
    authStore,
    categoryId,
    durationLimitMinutes,
    handleCreateClick,
    handleModalClose,
    handlePostCreated,
    isAuthenticated,
    isCreatePostModalOpen,
    openLogin,
    openRegister,
    search,
    sortBy,
} = usePostsAppShell();
const route = useRoute();
const router = useRouter();

const activeSearch = ref(search.value);
let searchInputTimer: ReturnType<typeof setTimeout> | null = null;

watch(search, (value) => {
    if (searchInputTimer) {
        clearTimeout(searchInputTimer);
    }

    searchInputTimer = setTimeout(() => {
        activeSearch.value = value;
        searchInputTimer = null;
    }, SEARCH_INPUT_DEBOUNCE_MS);
});

onBeforeUnmount(() => {
    if (searchInputTimer) {
        clearTimeout(searchInputTimer);
    }
});

watch([activeSearch, sortBy, categoryId], async () => {
    const trimmedSearch = activeSearch.value.trim();
    const nextQuery = {
        ...route.query,
        ...(trimmedSearch ? { search: trimmedSearch } : {}),
        ...(sortBy.value !== 'newest' ? { sortBy: sortBy.value } : {}),
        ...(categoryId.value !== null ? { categoryId: String(categoryId.value) } : {}),
    };

    if (!trimmedSearch) {
        delete nextQuery.search;
    }

    if (sortBy.value === 'newest') {
        delete nextQuery.sortBy;
    }

    if (categoryId.value === null) {
        delete nextQuery.categoryId;
    }

    const currentSearch = typeof route.query.search === 'string' ? route.query.search : undefined;
    const currentSortBy = typeof route.query.sortBy === 'string' ? route.query.sortBy : undefined;
    const currentCategoryId = typeof route.query.categoryId === 'string' ? route.query.categoryId : undefined;

    if (currentSearch === nextQuery.search
        && currentSortBy === nextQuery.sortBy
        && currentCategoryId === nextQuery.categoryId) {
        return;
    }

    await router.replace({
        query: nextQuery,
    });
});

const feedKind = computed<PrimaryPostsFeedKind>(() => {
    const routeFeedKind = route.meta.feedKind;

    if (routeFeedKind === 'subscriptions' || routeFeedKind === 'favorites') {
        return routeFeedKind;
    }

    return 'popular';
});

const primaryFeed = usePrimaryPostsFeed(feedKind);
const {
    activePostId: primaryActivePostId,
    canLoadMore: primaryCanLoadMore,
    errorMessage: primaryErrorMessage,
    isInitialLoading: primaryIsInitialLoading,
    isLoadingMore: primaryIsLoadingMore,
    isPlaying: primaryIsPlaying,
    likePendingPostIds: primaryLikePendingPostIds,
    loadMoreTrigger: primaryLoadMoreTrigger,
    posts: primaryPosts,
    setActivePost: primarySetActivePost,
    toggleLike: primaryToggleLike,
} = primaryFeed;

const isSearchMode = computed(() => activeSearch.value.trim() !== '' || categoryId.value !== null);

const searchFeed = useSearchPostsFeed({ search: activeSearch, categoryId, sortBy });
const {
    activePostId: searchActivePostId,
    canLoadMore: searchCanLoadMore,
    errorMessage: searchErrorMessage,
    isInitialLoading: searchIsInitialLoading,
    isLoadingMore: searchIsLoadingMore,
    isPlaying: searchIsPlaying,
    likePendingPostIds: searchLikePendingPostIds,
    loadMoreTrigger: searchLoadMoreTrigger,
    posts: searchPosts,
    setActivePost: searchSetActivePost,
    toggleLike: searchToggleLike,
} = searchFeed;

const primaryFeedTitle = computed(() => {
    if (feedKind.value === 'subscriptions') {
        return uk.home.subscriptionsFeed.title;
    }

    if (feedKind.value === 'favorites') {
        return uk.home.favoritesFeed.title;
    }

    return uk.home.popularFeed.title;
});

const primaryFeedEmptyMessage = computed(() => {
    if (feedKind.value === 'subscriptions') {
        return uk.home.subscriptionsFeed.empty;
    }

    if (feedKind.value === 'favorites') {
        return uk.home.favoritesFeed.empty;
    }

    return uk.home.popularFeed.empty;
});

const makeLoadMoreTriggerSetter = (target: typeof primaryLoadMoreTrigger) => (element: Element | unknown): void => {
    target.value = element instanceof HTMLElement ? element : null;
};

const setPrimaryLoadMoreTrigger = makeLoadMoreTriggerSetter(primaryLoadMoreTrigger);
const setSearchLoadMoreTrigger = makeLoadMoreTriggerSetter(searchLoadMoreTrigger);

const activeNavKey = computed<AppNavigationItem['key']>(() => feedKind.value === 'popular' ? 'home' : feedKind.value);
const activeLikePendingPostIds = computed(() => isSearchMode.value ? searchLikePendingPostIds.value : primaryLikePendingPostIds.value);

const handleShellLikeToggle = async (postId: number): Promise<void> => {
    if (isSearchMode.value) {
        await searchToggleLike(postId);
        return;
    }

    await primaryToggleLike(postId);
};
</script>

<template>
  <AppShell
      v-model:search="search"
      v-model:sort-by="sortBy"
      v-model:category-id="categoryId"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="activeLikePendingPostIds"
      :active-nav-key="activeNavKey"
      @create="handleCreateClick"
      @login="openLogin"
      @like-toggle="handleShellLikeToggle"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <div class="posts-feed-page">
      <PostsFeedSection
          v-if="isSearchMode"
          :posts="searchPosts"
          :title="uk.home.searchFeed.title"
          :empty-message="uk.home.searchFeed.empty"
          :active-post-id="searchActivePostId"
          :is-playing="searchIsPlaying"
          :like-pending-post-ids="searchLikePendingPostIds"
          :is-initial-loading="searchIsInitialLoading"
          :is-loading-more="searchIsLoadingMore"
          :error-message="searchErrorMessage"
          :can-load-more="searchCanLoadMore"
          :set-load-more-trigger="setSearchLoadMoreTrigger"
          @activate="searchSetActivePost"
          @like-toggle="searchToggleLike"
      />

      <PostsFeedSection
          v-else
          :posts="primaryPosts"
          :title="primaryFeedTitle"
          :empty-message="primaryFeedEmptyMessage"
          :active-post-id="primaryActivePostId"
          :is-playing="primaryIsPlaying"
          :like-pending-post-ids="primaryLikePendingPostIds"
          :is-initial-loading="primaryIsInitialLoading"
          :is-loading-more="primaryIsLoadingMore"
          :error-message="primaryErrorMessage"
          :can-load-more="primaryCanLoadMore"
          :set-load-more-trigger="setPrimaryLoadMoreTrigger"
          @activate="primarySetActivePost"
          @like-toggle="primaryToggleLike"
      />
    </div>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />
</template>
