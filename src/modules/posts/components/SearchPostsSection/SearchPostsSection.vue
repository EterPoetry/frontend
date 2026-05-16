<script setup lang="ts">
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import PostsList from '@/modules/posts/components/PostsList/PostsList.vue';
import PostCardSkeleton from '@/modules/posts/components/PostCard/PostCardSkeleton.vue';
import { SearchPostsSectionProps } from '@/modules/posts/interfaces/search-posts-section-props.interface';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { uk } from '@/shared/locales/uk';
import './SearchPostsSection.css';

defineProps<SearchPostsSectionProps>();

defineEmits<{
    (e: PostsEvents.ACTIVATE, postId: number): void;
    (e: PostsEvents.LIKE_TOGGLE, postId: number): void;
}>();
</script>

<template>
  <section class="search-posts-section">
    <div class="search-posts-section__header">
      <h1 class="search-posts-section__title">{{ uk.home.searchFeed.title }}</h1>
    </div>

    <div class="search-posts-section__body">
      <ErrorAlert v-if="errorMessage && !posts.length" :message="errorMessage" />

      <div v-if="isInitialLoading" class="search-posts-section__skeletons">
        <PostCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="!posts.length && !errorMessage" class="search-posts-section__state">
        {{ uk.home.searchFeed.empty }}
      </div>

      <template v-else>
        <PostsList
            :posts="posts"
            :active-post-id="activePostId"
            :is-playing="isPlaying"
            :like-pending-post-ids="likePendingPostIds"
            @activate="$emit(PostsEvents.ACTIVATE, $event)"
            @like-toggle="$emit(PostsEvents.LIKE_TOGGLE, $event)"
        />

        <div v-if="errorMessage && posts.length" class="search-posts-section__footer">
          <p class="search-posts-section__footer-text">{{ errorMessage }}</p>
        </div>

        <div v-if="isLoadingMore" class="search-posts-section__skeletons search-posts-section__skeletons--more">
          <PostCardSkeleton v-for="i in 3" :key="i" />
        </div>

        <div
            v-if="canLoadMore"
            :ref="setLoadMoreTrigger"
            class="search-posts-section__sentinel"
            aria-hidden="true"
        />
      </template>
    </div>
  </section>
</template>
