<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import type { Post } from '@/modules/posts/interfaces/post.interface';
import { formatPostDuration } from '@/modules/posts/utils/post-formatting.utils';
import { uk } from '@/shared/locales/uk';
import './ProfileDraftPostsSection.css';

defineProps<{
    draftsErrorMessage: string;
    draftPosts: Post[];
    isDraftsLoading: boolean;
    canLoadMoreDrafts: boolean;
    isDraftsLoadingMore: boolean;
}>();

defineEmits<{
    (e: 'load-more'): void;
}>();

const formatPostDate = (value: string): string => new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
}).format(new Date(value));
</script>

<template>
  <div class="profile-draft-posts">
    <ErrorAlert v-if="draftsErrorMessage && !draftPosts.length" :message="draftsErrorMessage" />

    <div v-else-if="isDraftsLoading" class="profile-draft-posts__skeletons" aria-hidden="true">
      <article
          v-for="index in 3"
          :key="index"
          class="profile-draft-posts__card profile-draft-posts__card--skeleton"
      >
        <div class="profile-draft-posts__main">
          <div class="profile-draft-posts__line profile-draft-posts__line--title sk" />
          <div class="profile-draft-posts__line profile-draft-posts__line--body sk" />
          <div class="profile-draft-posts__line profile-draft-posts__line--meta sk" />
        </div>
      </article>
    </div>

    <div v-else-if="!draftPosts.length" class="profile-draft-posts__state">
      {{ uk.profile.emptyStates.draftsUnavailable }}
    </div>

    <template v-else>
      <RouterLink
          v-for="post in draftPosts"
          :key="post.postId"
          :to="{ name: PostRouteNames.EDIT_POST, params: { postId: post.postId } }"
          class="profile-draft-posts__card"
          :class="{ 'profile-draft-posts__card--processing': post.status === PostStatus.PROCESSING }"
      >
        <div class="profile-draft-posts__main">
          <span class="profile-draft-posts__title">
            {{ post.title || uk.posts.player.untitled }}
          </span>

          <p v-if="post.description || post.text" class="profile-draft-posts__description">
            {{ post.description || post.text }}
          </p>

          <div class="profile-draft-posts__meta">
            <span>{{ formatPostDate(post.updatedAt) }}</span>
            <template v-if="post.audioDurationSeconds">
              <span class="profile-draft-posts__dot" aria-hidden="true">•</span>
              <span class="profile-draft-posts__duration">{{ formatPostDuration(post.audioDurationSeconds) }}</span>
            </template>
            <span class="profile-draft-posts__dot" aria-hidden="true">•</span>
            <span
                class="profile-draft-posts__status"
                :class="{ 'profile-draft-posts__status--processing': post.status === PostStatus.PROCESSING }"
            >
              <span
                  v-if="post.status === PostStatus.PROCESSING"
                  class="profile-draft-posts__status-indicator"
                  aria-hidden="true"
              />
              {{ post.status === PostStatus.PROCESSING ? uk.profile.posts.processing : uk.profile.sections.drafts }}
            </span>
          </div>
        </div>
      </RouterLink>

      <p v-if="draftsErrorMessage" class="profile-draft-posts__footer-error">
        {{ draftsErrorMessage }}
      </p>

      <div v-if="canLoadMoreDrafts" class="profile-draft-posts__more">
        <BaseButton
            :label="uk.profile.actions.loadMore"
            type="button"
            variant="secondary"
            :disabled="false"
            :is-loading="isDraftsLoadingMore"
            @click="$emit('load-more')"
        />
      </div>
    </template>
  </div>
</template>
