<script setup lang="ts">
import { computed } from 'vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import commentIconUrl from '@/shared/assets/icons/ui/comment.svg';
import heartIconUrl from '@/shared/assets/icons/ui/heart.svg';
import heartActiveIconUrl from '@/shared/assets/icons/ui/heart-active.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import volumeIconUrl from '@/shared/assets/icons/ui/volume.svg';
import volumeMutedIconUrl from '@/shared/assets/icons/ui/volume-muted.svg';
import AudioProgressBar from '@/shared/components/AudioProgressBar/AudioProgressBar.vue';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { StickyPostPlayerProps } from '@/modules/posts/interfaces/sticky-post-player-props.interface';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { formatPostDuration } from '@/modules/posts/utils/post-formatting.utils';
import { getAuthorInitial } from '@/modules/posts/utils/post-author.utils';
import { uk } from '@/shared/locales/uk';
import { formatCompactNumber } from '@/shared/utils/number.utils';
import { formatSecondsToClock } from '@/shared/utils/time.utils';
import './StickyPostPlayer.css';

const props = defineProps<StickyPostPlayerProps>();

const emit = defineEmits<{
    (e: PostsEvents.LIKE_TOGGLE, postId: number): void;
}>();

const player = usePostPlayer();

const formattedCurrentTime = computed(() => formatSecondsToClock(player.currentTimeSeconds.value));
const formattedDuration = computed(() => formatPostDuration(Math.round(player.durationSeconds.value)));
const volumePercent = computed(() => `${Math.round(player.volume.value * 100)}%`);
const isMuted = computed(() => player.isMuted.value || player.volume.value === 0);
const volumeIcon = computed(() => isMuted.value ? volumeMutedIconUrl : volumeIconUrl);
const seekPercent = computed({
    get: () => player.progressPercent.value,
    set: (value: number) => {
        void player.seekToPercent(value);
    },
});

const handleTogglePlayback = (): void => {
    const post = player.activePost.value;

    if (!post) {
        return;
    }

    void player.togglePostPlayback(post);
};

const handleClose = (): void => {
    void player.closePlayer();
};

const handleVolumeInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
        return;
    }

    player.setVolume(Number(target.value) / 100);
};

const handleLikeClick = (): void => {
    const postId = player.activePost.value?.postId;

    if (!postId || props.likePendingPostIds?.includes(postId)) {
        return;
    }

    emit(PostsEvents.LIKE_TOGGLE, postId);
};
</script>

<template>
  <Transition name="sticky-post-player">
    <section v-if="player.hasActivePost.value && player.activePost.value" class="sticky-post-player" aria-label="Плеєр поточного поста">
      <div class="sticky-post-player__shell">
        <button
            type="button"
            class="sticky-post-player__close"
            :aria-label="uk.posts.player.close"
            @click="handleClose"
        >
          <img :src="closeIconUrl" alt="" />
        </button>

        <div class="sticky-post-player__meta">
          <h3 class="sticky-post-player__title">
            <span v-if="player.isPlaying.value" class="sticky-post-player__playing-dot" aria-hidden="true" />
            {{ player.activePost.value.title || uk.posts.player.untitled }}
          </h3>

          <div class="sticky-post-player__author-row">
            <span
                v-if="!player.activePost.value.author.photo"
                class="sticky-post-player__author-badge sticky-post-player__author-badge--fallback"
            >
              {{ getAuthorInitial(player.activePost.value.author.name) }}
            </span>
            <img
                v-else
                :src="player.activePost.value.author.photo"
                :alt="player.activePost.value.author.name"
                class="sticky-post-player__author-badge"
            />

            <span class="sticky-post-player__author">{{ player.activePost.value.author.name }}</span>
          </div>
        </div>

        <div class="sticky-post-player__transport">
          <button
              type="button"
              class="sticky-post-player__play audio-play-button"
              :class="{ 'audio-play-button--active': player.isPlaying.value }"
              :aria-label="player.isPlaying.value ? uk.posts.audio.pause : uk.posts.audio.play"
              @click="handleTogglePlayback"
          >
            <img v-if="player.isPlaying.value" :src="pauseLightIconUrl" alt="" class="audio-play-button__pause-icon" />
            <img v-else :src="playIconUrl" :alt="uk.posts.audio.play" class="audio-play-button__play-icon" />
          </button>

          <div class="sticky-post-player__timeline">
            <span class="sticky-post-player__time">{{ formattedCurrentTime }}</span>

            <AudioProgressBar
                v-model="seekPercent"
                :ariaLabel="uk.posts.player.seek"
                density="compact"
            />

            <span class="sticky-post-player__time">{{ formattedDuration }}</span>
          </div>
        </div>

        <div class="sticky-post-player__side">
          <div class="sticky-post-player__stats">
            <button
                type="button"
                class="sticky-post-player__stat stat-button"
                :class="{ 'stat-button--active': player.activePost.value.isLiked }"
                :aria-label="uk.home.popularFeed.likes"
                :disabled="likePendingPostIds?.includes(player.activePost.value.postId)"
                @click="handleLikeClick"
            >
              <img
                  :src="player.activePost.value.isLiked ? heartActiveIconUrl : heartIconUrl"
                  alt=""
                  class="sticky-post-player__stat-icon"
              />
              <span class="sticky-post-player__stat-value">{{ formatCompactNumber(player.activePost.value.likesCount) }}</span>
            </button>

            <div class="sticky-post-player__stat">
              <img
                  :src="commentIconUrl"
                  :alt="uk.home.popularFeed.comments"
                  class="sticky-post-player__stat-icon sticky-post-player__stat-icon--comment"
              />
              <span class="sticky-post-player__stat-value">{{ formatCompactNumber(player.activePost.value.commentsCount) }}</span>
            </div>
          </div>

          <div class="sticky-post-player__volume-group">
            <button
                type="button"
                class="sticky-post-player__mute"
                :aria-label="player.isMuted.value ? uk.posts.player.unmute : uk.posts.player.mute"
                @click="player.toggleMute"
            >
              <img :src="volumeIcon" alt="" aria-hidden="true" class="sticky-post-player__mute-icon" :class="{ 'sticky-post-player__mute-icon--muted': isMuted }" />
            </button>

            <input
                type="range"
                min="0"
                max="100"
                step="1"
                class="sticky-post-player__volume"
                :value="Math.round(player.volume.value * 100)"
                :style="{ '--player-volume': volumePercent }"
                :aria-label="uk.posts.player.volume"
                @input="handleVolumeInput"
            />
          </div>
        </div>
      </div>
    </section>
  </Transition>
</template>
