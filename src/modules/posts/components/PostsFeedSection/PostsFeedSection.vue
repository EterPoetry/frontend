<script setup lang="ts">
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import PostsList from '@/modules/posts/components/PostsList/PostsList.vue';
import PostCardSkeleton from '@/modules/posts/components/PostCard/PostCardSkeleton.vue';
import {
    FEED_INITIAL_SKELETON_COUNT,
    FEED_LOAD_MORE_SKELETON_COUNT,
} from '@/modules/posts/constants/popular-posts.constants';
import { PostsFeedSectionProps } from '@/modules/posts/interfaces/posts-feed-section-props.interface';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import './PostsFeedSection.css';

defineProps<PostsFeedSectionProps>();

defineEmits<{
    (e: PostsEvents.ACTIVATE, postId: number): void;
    (e: PostsEvents.LIKE_TOGGLE, postId: number): void;
}>();
</script>

<template>
  <section class="posts-feed-section">
    <div class="posts-feed-section__header">
      <h1 class="posts-feed-section__title">{{ title }}</h1>
    </div>

    <div class="posts-feed-section__body">
      <ErrorAlert v-if="errorMessage && !posts.length" :message="errorMessage" />

      <div v-if="isInitialLoading" class="posts-feed-section__skeletons">
        <PostCardSkeleton v-for="i in FEED_INITIAL_SKELETON_COUNT" :key="i" />
      </div>

      <div v-else-if="!posts.length && !errorMessage" class="posts-feed-section__state">
        {{ emptyMessage }}
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

        <div v-if="errorMessage && posts.length" class="posts-feed-section__footer">
          <p class="posts-feed-section__footer-text">{{ errorMessage }}</p>
        </div>

        <div v-if="isLoadingMore" class="posts-feed-section__skeletons posts-feed-section__skeletons--more">
          <PostCardSkeleton v-for="i in FEED_LOAD_MORE_SKELETON_COUNT" :key="i" />
        </div>

        <div
            v-if="canLoadMore"
            :ref="setLoadMoreTrigger"
            class="posts-feed-section__sentinel"
            aria-hidden="true"
        />
      </template>
    </div>
  </section>
</template>
