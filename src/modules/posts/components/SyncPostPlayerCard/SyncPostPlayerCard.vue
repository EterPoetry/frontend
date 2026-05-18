<script setup lang="ts">
import PostAudioWaveform from '@/modules/posts/components/PostAudioWaveform/PostAudioWaveform.vue';
import PlayerVolumeControl from '@/modules/posts/components/PlayerVolumeControl/PlayerVolumeControl.vue';
import { SYNC_PLAYER_SEEK_STEP_SECONDS } from '@/modules/posts/constants/post-sync.constants';
import type { PostAudioAnalysis } from '@/modules/posts/interfaces/post-audio-analysis.interface';
import { uk } from '@/shared/locales/uk';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import { formatSecondsToClock } from '@/shared/utils/time.utils';

defineProps<{
    progressValue: number;
    currentTimeSeconds: number;
    durationSeconds: number;
    isThisPostActive: boolean;
    isPlaying: boolean;
    isSeekDisabled: boolean;
    audioAnalysis?: PostAudioAnalysis | null;
    audioEnergy?: number;
    volume: number;
    isMuted: boolean;
}>();

defineEmits<{
    (event: 'seek-player', percent: number): void;
    (event: 'toggle-playback'): void;
    (event: 'skip-seconds', delta: number): void;
    (event: 'set-volume', volume: number): void;
    (event: 'toggle-mute'): void;
}>();
</script>

<template>
  <div class="sync-page__card sync-page__player-card">
    <div class="sync-page__player-card-header">
      <h2 class="sync-page__card-title">{{ uk.posts.sync.playerCard }}</h2>
      <PlayerVolumeControl
          :volume="volume"
          :is-muted="isMuted"
          @set-volume="$emit('set-volume', $event)"
          @toggle-mute="$emit('toggle-mute')"
      />
    </div>

    <PostAudioWaveform
        :model-value="progressValue"
        :audio-analysis="audioAnalysis"
        :audio-energy="audioEnergy"
        :duration-seconds="durationSeconds || undefined"
        :is-playing="isPlaying && isThisPostActive"
        :ariaLabel="uk.posts.player.seek"
        @update:model-value="$emit('seek-player', $event)"
    />

    <div class="sync-page__player-time-row">
      <span class="sync-page__player-time">{{ formatSecondsToClock(currentTimeSeconds) }}</span>
      <span class="sync-page__player-time">{{ formatSecondsToClock(durationSeconds) }}</span>
    </div>

    <div class="sync-page__player-controls">
      <button
          type="button"
          class="sync-page__player-skip"
          :aria-label="uk.posts.sync.adjustMinus"
          @click="$emit('skip-seconds', -SYNC_PLAYER_SEEK_STEP_SECONDS)"
      >
        {{ uk.posts.sync.adjustMinus }}
      </button>

      <button
          type="button"
          class="sync-page__player-btn"
          :aria-label="isPlaying && isThisPostActive ? uk.posts.sync.pause : uk.posts.sync.play"
          @click="$emit('toggle-playback')"
      >
        <img
            v-if="isPlaying && isThisPostActive"
            :src="pauseLightIconUrl"
            alt=""
            class="sync-page__player-icon"
        />
        <img
            v-else
            :src="playIconUrl"
            alt=""
            class="sync-page__player-icon"
        />
      </button>

      <button
          type="button"
          class="sync-page__player-skip"
          :aria-label="uk.posts.sync.adjustPlus"
          @click="$emit('skip-seconds', SYNC_PLAYER_SEEK_STEP_SECONDS)"
      >
        {{ uk.posts.sync.adjustPlus }}
      </button>
    </div>
  </div>
</template>
