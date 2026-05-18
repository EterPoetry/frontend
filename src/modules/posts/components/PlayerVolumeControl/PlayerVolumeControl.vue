<script setup lang="ts">
import { computed } from 'vue';
import { uk } from '@/shared/locales/uk';
import volumeIconUrl from '@/shared/assets/icons/ui/volume.svg';
import volumeMutedIconUrl from '@/shared/assets/icons/ui/volume-muted.svg';
import './PlayerVolumeControl.css';

const props = defineProps<{
    volume: number;
    isMuted: boolean;
}>();

const emit = defineEmits<{
    (event: 'set-volume', volume: number): void;
    (event: 'toggle-mute'): void;
}>();

const isEffectivelyMuted = computed(() => props.isMuted || props.volume === 0);
const volumeIcon = computed(() => isEffectivelyMuted.value ? volumeMutedIconUrl : volumeIconUrl);
const volumePercent = computed(() => `${Math.round(props.volume * 100)}%`);

const handleVolumeInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    emit('set-volume', Number(input.value) / 100);
};
</script>

<template>
  <div class="player-volume-control">
    <button
        type="button"
        class="player-volume-control__mute"
        :aria-label="isEffectivelyMuted ? uk.posts.player.unmute : uk.posts.player.mute"
        @click="$emit('toggle-mute')"
    >
      <img
          :src="volumeIcon"
          alt=""
          aria-hidden="true"
          class="player-volume-control__icon"
          :class="{ 'player-volume-control__icon--muted': isEffectivelyMuted }"
      />
    </button>

    <div class="player-volume-control__popup">
      <div class="player-volume-control__popup-box">
        <div class="player-volume-control__popup-track">
          <input
              type="range"
              min="0"
              max="100"
              step="1"
              class="player-volume-control__slider"
              :value="Math.round(volume * 100)"
              :style="{ '--pvc-fill': volumePercent }"
              :aria-label="uk.posts.player.volume"
              @input="handleVolumeInput"
          />
        </div>
      </div>
    </div>
  </div>
</template>
