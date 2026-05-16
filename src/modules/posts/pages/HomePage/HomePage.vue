<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePopularPostsFeed } from '@/modules/posts/composables/usePopularPostsFeed';
import { useSearchPostsFeed } from '@/modules/posts/composables/useSearchPostsFeed';
import PopularPostsSection from '@/modules/posts/components/PopularPostsSection/PopularPostsSection.vue';
import SearchPostsSection from '@/modules/posts/components/SearchPostsSection/SearchPostsSection.vue';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import './HomePage.css';

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

const isSearchMode = computed(() => activeSearch.value.trim() !== '' || categoryId.value !== null);

const {
    activePostId: popularActivePostId,
    canLoadMore: popularCanLoadMore,
    errorMessage: popularErrorMessage,
    isInitialLoading: popularIsInitialLoading,
    isPlaying: popularIsPlaying,
    isLoadingMore: popularIsLoadingMore,
    likePendingPostIds: popularLikePendingPostIds,
    loadMoreTrigger: popularLoadMoreTrigger,
    posts: popularPosts,
    setActivePost: popularSetActivePost,
    toggleLike: popularToggleLike,
} = usePopularPostsFeed();

const {
    activePostId: searchActivePostId,
    canLoadMore: searchCanLoadMore,
    errorMessage: searchErrorMessage,
    isInitialLoading: searchIsInitialLoading,
    isPlaying: searchIsPlaying,
    isLoadingMore: searchIsLoadingMore,
    likePendingPostIds: searchLikePendingPostIds,
    loadMoreTrigger: searchLoadMoreTrigger,
    posts: searchPosts,
    setActivePost: searchSetActivePost,
    toggleLike: searchToggleLike,
} = useSearchPostsFeed({ search: activeSearch, categoryId, sortBy });

const setPopularLoadMoreTrigger = (ref: Element | unknown): void => {
    popularLoadMoreTrigger.value = ref instanceof HTMLElement ? ref : null;
};

const setSearchLoadMoreTrigger = (ref: Element | unknown): void => {
    searchLoadMoreTrigger.value = ref instanceof HTMLElement ? ref : null;
};
</script>

<template>
  <AppShell
      v-model:search="search"
      v-model:sort-by="sortBy"
      v-model:category-id="categoryId"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="isSearchMode ? searchLikePendingPostIds : popularLikePendingPostIds"
      active-nav-key="home"
      @create="handleCreateClick"
      @login="openLogin"
      @like-toggle="isSearchMode ? searchToggleLike($event) : popularToggleLike($event)"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <div class="home-page">
      <SearchPostsSection
          v-if="isSearchMode"
          :posts="searchPosts"
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

      <PopularPostsSection
          v-else
          :posts="popularPosts"
          :active-post-id="popularActivePostId"
          :is-playing="popularIsPlaying"
          :like-pending-post-ids="popularLikePendingPostIds"
          :is-initial-loading="popularIsInitialLoading"
          :is-loading-more="popularIsLoadingMore"
          :error-message="popularErrorMessage"
          :can-load-more="popularCanLoadMore"
          :set-load-more-trigger="setPopularLoadMoreTrigger"
          @activate="popularSetActivePost"
          @like-toggle="popularToggleLike"
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
