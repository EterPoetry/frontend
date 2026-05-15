<script setup lang="ts">
import { usePopularPostsFeed } from '@/modules/posts/composables/usePopularPostsFeed';
import PopularPostsSection from '@/modules/posts/components/PopularPostsSection/PopularPostsSection.vue';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import './HomePage.css';

const {
    authStore,
    durationLimitMinutes,
    handleCreateClick,
    handleModalClose,
    handlePostCreated,
    isAuthenticated,
    isCreatePostModalOpen,
    openLogin,
    openRegister,
    search,
} = usePostsAppShell();

const {
    activePostId,
    canLoadMore,
    errorMessage,
    isInitialLoading,
    isPlaying,
    isLoadingMore,
    likePendingPostIds,
    loadMoreTrigger,
    posts,
    setActivePost,
    toggleLike,
} = usePopularPostsFeed();

const setLoadMoreTrigger = (ref: Element | unknown): void => {
    loadMoreTrigger.value = ref instanceof HTMLElement ? ref : null;
};
</script>

<template>
  <AppShell
      v-model:search="search"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="likePendingPostIds"
      active-nav-key="home"
      @create="handleCreateClick"
      @login="openLogin"
      @like-toggle="toggleLike"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <div class="home-page">
      <PopularPostsSection
          :posts="posts"
          :active-post-id="activePostId"
          :is-playing="isPlaying"
          :like-pending-post-ids="likePendingPostIds"
          :is-initial-loading="isInitialLoading"
          :is-loading-more="isLoadingMore"
          :error-message="errorMessage"
          :can-load-more="canLoadMore"
          :set-load-more-trigger="setLoadMoreTrigger"
          @activate="setActivePost"
          @like-toggle="toggleLike"
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
