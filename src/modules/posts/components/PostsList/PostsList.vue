<script setup lang="ts">
import PostCard from '@/modules/posts/components/PostCard/PostCard.vue';
import { PostsListProps } from '@/modules/posts/interfaces/posts-list-props.interface';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import './PostsList.css';

defineProps<PostsListProps>();

defineEmits<{
    (e: PostsEvents.ACTIVATE, postId: number): void;
    (e: PostsEvents.LIKE_TOGGLE, postId: number): void;
}>();
</script>

<template>
  <div class="posts-list">
    <PostCard
        v-for="post in posts"
        :key="post.postId"
        :post="post"
        :is-active="activePostId === post.postId"
        :is-playing="isPlaying && activePostId === post.postId"
        :like-pending="likePendingPostIds?.includes(post.postId)"
        @activate="$emit(PostsEvents.ACTIVATE, $event)"
        @like-toggle="$emit(PostsEvents.LIKE_TOGGLE, $event)"
    />
  </div>
</template>
