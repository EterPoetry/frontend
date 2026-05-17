<script setup lang="ts">
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import PostCard from '@/modules/posts/components/PostCard/PostCard.vue';
import PostCardSkeleton from '@/modules/posts/components/PostCard/PostCardSkeleton.vue';
import type { Post } from '@/modules/posts/interfaces/post.interface';
import type {
    UserPostsAuthorType,
    UserPostsSortBy,
    UserPostsSortOrder,
} from '@/modules/posts/interfaces/get-user-posts-query.interface';
import { uk } from '@/shared/locales/uk';
import './ProfilePublishedPostsSection.css';

defineProps<{
    isPageLoading: boolean;
    isPublishedLoading: boolean;
    publishedPosts: Post[];
    activePublishedPostId: number | null;
    isPlayerPlaying: boolean;
    publishedLikePendingPostIds: number[];
    publishedErrorMessage: string;
    canLoadMorePublished: boolean;
    isPublishedLoadingMore: boolean;
    publishedSortBy: UserPostsSortBy;
    publishedSortOrder: UserPostsSortOrder;
    publishedAuthorType: UserPostsAuthorType | null;
}>();

defineEmits<{
    (e: 'set-author-type', type: UserPostsAuthorType | null): void;
    (e: 'set-sort', sortBy: UserPostsSortBy): void;
    (e: 'activate', postId: number): void;
    (e: 'like-toggle', postId: number): void;
    (e: 'load-more'): void;
}>();

const sortOptions: Array<{ key: UserPostsSortBy; label: string }> = [
    { key: 'createdAt', label: uk.profile.sortFilter.sortByDate },
    { key: 'listens', label: uk.profile.sortFilter.sortByListens },
];
</script>

<template>
  <div class="profile-published-posts">
    <div class="profile-published-posts__controls">
      <div class="profile-published-posts__filter-group">
        <button
            type="button"
            class="profile-published-posts__filter-chip"
            :class="{ 'profile-published-posts__filter-chip--active': publishedAuthorType === null }"
            @click="$emit('set-author-type', null)"
        >
          {{ uk.profile.sortFilter.filterAll }}
        </button>
        <button
            type="button"
            class="profile-published-posts__filter-chip"
            :class="{ 'profile-published-posts__filter-chip--active': publishedAuthorType === 'author' }"
            @click="$emit('set-author-type', 'author')"
        >
          {{ uk.profile.sortFilter.filterAuthor }}
        </button>
        <button
            type="button"
            class="profile-published-posts__filter-chip"
            :class="{ 'profile-published-posts__filter-chip--active': publishedAuthorType === 'original' }"
            @click="$emit('set-author-type', 'original')"
        >
          {{ uk.profile.sortFilter.filterOriginal }}
        </button>
      </div>

      <span class="profile-published-posts__controls-divider" aria-hidden="true" />

      <div class="profile-published-posts__sort-group">
        <button
            v-for="option in sortOptions"
            :key="option.key"
            type="button"
            class="profile-published-posts__sort-chip"
            :class="{ 'profile-published-posts__sort-chip--active': publishedSortBy === option.key }"
            @click="$emit('set-sort', option.key)"
        >
          {{ option.label }}
          <span
              v-if="publishedSortBy === option.key"
              class="profile-published-posts__sort-arrow"
              :class="{ 'profile-published-posts__sort-arrow--asc': publishedSortOrder === 'asc' }"
              aria-hidden="true"
          >
            ↓
          </span>
        </button>
      </div>
    </div>

    <ErrorAlert v-if="publishedErrorMessage && !publishedPosts.length" :message="publishedErrorMessage" />

    <div
        v-else-if="isPageLoading || isPublishedLoading"
        class="profile-published-posts__skeleton-list"
        aria-hidden="true"
    >
      <PostCardSkeleton v-for="index in 3" :key="index" />
    </div>

    <div v-else-if="!publishedPosts.length" class="profile-published-posts__state">
      {{ uk.profile.emptyStates.publishedUnavailable }}
    </div>

    <template v-else>
      <PostCard
          v-for="post in publishedPosts"
          :key="post.postId"
          :post="post"
          :is-active="activePublishedPostId === post.postId"
          :is-playing="isPlayerPlaying && activePublishedPostId === post.postId"
          :like-pending="publishedLikePendingPostIds.includes(post.postId)"
          @activate="$emit('activate', $event)"
          @like-toggle="$emit('like-toggle', $event)"
      />

      <p v-if="publishedErrorMessage" class="profile-published-posts__footer-error">
        {{ publishedErrorMessage }}
      </p>

      <div v-if="canLoadMorePublished" class="profile-published-posts__more">
        <BaseButton
            :label="uk.profile.actions.loadMore"
            type="button"
            variant="secondary"
            :disabled="false"
            :is-loading="isPublishedLoadingMore"
            @click="$emit('load-more')"
        />
      </div>
    </template>
  </div>
</template>
