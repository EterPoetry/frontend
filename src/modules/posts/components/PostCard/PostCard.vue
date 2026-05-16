<script setup lang="ts">
import { useNavigateToPostComments } from '@/modules/posts/composables/useNavigateToPostComments';
import heartIconUrl from '@/shared/assets/icons/ui/heart.svg';
import heartActiveIconUrl from '@/shared/assets/icons/ui/heart-active.svg';
import playsIconUrl from '@/shared/assets/icons/ui/plays.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import commentIconUrl from '@/shared/assets/icons/ui/comment.svg';
import { PostCardProps } from '@/modules/posts/interfaces/post-card-props.interface';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { uk } from '@/shared/locales/uk';
import {
    formatPostDuration,
    formatPostTag,
} from '@/modules/posts/utils/post-formatting.utils';
import { getAuthorInitial } from '@/modules/posts/utils/post-author.utils';
import { formatCompactNumber } from '@/shared/utils/number.utils';
import './PostCard.css';

const props = withDefaults(defineProps<PostCardProps>(), {
    isActive: false,
    isPlaying: false,
});
const { navigateToPostComments } = useNavigateToPostComments();

const emit = defineEmits<{
    (e: PostsEvents.ACTIVATE, postId: number): void;
    (e: PostsEvents.LIKE_TOGGLE, postId: number): void;
}>();

const handleLikeClick = (): void => {
    if (props.likePending) {
        return;
    }

    emit(PostsEvents.LIKE_TOGGLE, props.post.postId);
};

const handleCommentClick = (): void => {
    navigateToPostComments(props.post.postId);
};
</script>

<template>
  <article class="post-card" :class="{ 'post-card--active': isActive }">
    <div class="post-card__main">
      <RouterLink
          :to="{ name: PostRouteNames.POST, params: { postId: post.postId } }"
          class="post-card__meta-link"
      >
        <div class="post-card__meta-block">
          <h3 class="post-card__title">
            <span class="post-card__title-link">
              {{ post.title || 'Без назви' }}
            </span>
          </h3>

          <div class="post-card__meta-row">
            <span v-if="post.originAuthorName" class="post-card__origin-author">
              {{ post.originAuthorName }}
            </span>
            <span v-if="post.originAuthorName" class="post-card__dot" aria-hidden="true" />

            <span class="post-card__author">
              <img
                  v-if="post.author.photo"
                  :src="post.author.photo"
                  :alt="post.author.name"
                  class="post-card__author-photo"
              />
              <span v-else class="post-card__author-fallback">
                {{ getAuthorInitial(post.author.name) }}
              </span>

              <span class="post-card__author-name">
                {{ post.author.name }}
              </span>
            </span>
          </div>

          <div
              class="post-card__tags"
              :class="{ 'post-card__tags--empty': !post.categories.length }"
              :aria-hidden="!post.categories.length"
          >
            <span
                v-for="category in post.categories"
                :key="category.categoryId"
                class="post-card__tag"
            >
              {{ formatPostTag(category.categoryName) }}
            </span>
          </div>
        </div>
      </RouterLink>

      <div class="post-card__side">
        <div class="post-card__stats">
          <button
              type="button"
              class="post-card__stat stat-button"
              :class="{ 'stat-button--active': post.isLiked }"
              :aria-label="uk.home.popularFeed.likes"
              :disabled="likePending"
              @click="handleLikeClick"
          >
            <img
                :src="post.isLiked ? heartActiveIconUrl : heartIconUrl"
                alt=""
                class="post-card__stat-icon post-card__stat-icon--heart"
                :class="{ 'post-card__stat-icon--liked': post.isLiked }"
            />
            <span>{{ formatCompactNumber(post.likesCount) }}</span>
          </button>

          <button
              type="button"
              class="post-card__stat post-card__stat-link stat-button"
              :aria-label="uk.home.popularFeed.comments"
              @click="handleCommentClick"
          >
            <img
                :src="commentIconUrl"
                :alt="uk.home.popularFeed.comments"
                class="post-card__stat-icon post-card__stat-icon--comment"
            />
            <span>{{ formatCompactNumber(post.commentsCount) }}</span>
          </button>

          <div class="post-card__stat">
            <img
                :src="playsIconUrl"
                :alt="uk.home.popularFeed.listens"
                class="post-card__stat-icon post-card__stat-icon--eye"
            />
            <span>{{ formatCompactNumber(post.listens) }}</span>
          </div>
        </div>

        <div class="post-card__actions">
          <span class="post-card__duration">{{ formatPostDuration(post.audioDurationSeconds) }}</span>

          <button
              type="button"
              class="post-card__play-button audio-play-button"
              :class="{ 'audio-play-button--active': isActive }"
              :aria-label="isPlaying ? uk.posts.audio.pause : uk.home.popularFeed.play"
              @click="$emit(PostsEvents.ACTIVATE, post.postId)"
          >
            <img v-if="isPlaying" :src="pauseLightIconUrl" alt="" class="audio-play-button__pause-icon" />
            <img v-else :src="playIconUrl" :alt="uk.home.popularFeed.play" class="audio-play-button__play-icon" />
          </button>
        </div>
      </div>
    </div>
  </article>
</template>
