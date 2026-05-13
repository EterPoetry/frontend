<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';
import './AudioPreviewCard.css';

const props = withDefaults(defineProps<{
    src: string;
    title: string;
    disabled?: boolean;
    showRemove?: boolean;
}>(), {
    disabled: false,
    showRemove: true,
});

const emit = defineEmits<{
    (e: 'remove'): void;
}>();

const audioElement = new Audio();
const isPlaying = ref(false);
const duration = ref(0);
const currentTime = ref(0);

const formattedCurrentTime = computed(() => formatSecondsToClock(currentTime.value));
const formattedDuration = computed(() => formatSecondsToClock(duration.value));
const progress = computed({
    get: () => duration.value ? (currentTime.value / duration.value) * 100 : 0,
    set: (value: number) => {
        if (!duration.value) {
            return;
        }

        audioElement.currentTime = (value / 100) * duration.value;
    },
});

const syncTime = (): void => {
    currentTime.value = audioElement.currentTime;
};

const syncDuration = (): void => {
    duration.value = audioElement.duration || 0;
};

const handleEnded = (): void => {
    isPlaying.value = false;
    currentTime.value = 0;
};

const togglePlayback = async (): Promise<void> => {
    if (props.disabled) {
        return;
    }

    if (isPlaying.value) {
        audioElement.pause();
        isPlaying.value = false;
        return;
    }

    await audioElement.play();
    isPlaying.value = true;
};

watch(() => props.src, (nextSrc) => {
    audioElement.pause();
    audioElement.src = nextSrc;
    audioElement.load();
    isPlaying.value = false;
    currentTime.value = 0;
}, { immediate: true });

audioElement.addEventListener('timeupdate', syncTime);
audioElement.addEventListener('loadedmetadata', syncDuration);
audioElement.addEventListener('ended', handleEnded);

onBeforeUnmount(() => {
    audioElement.pause();
    audioElement.removeEventListener('timeupdate', syncTime);
    audioElement.removeEventListener('loadedmetadata', syncDuration);
    audioElement.removeEventListener('ended', handleEnded);
});
</script>

<template>
  <div class="audio-preview-card" :class="{ 'audio-preview-card--disabled': disabled }">
    <div class="audio-preview-card__top">
      <button
          type="button"
          class="audio-preview-card__play"
          :class="{ 'audio-preview-card__play--paused': isPlaying }"
          :aria-label="isPlaying ? uk.posts.audio.pause : uk.posts.audio.play"
          @click="togglePlayback"
      >
        <span v-if="isPlaying" class="audio-preview-card__pause-glyph" aria-hidden="true">
          <span />
          <span />
        </span>
        <span v-else class="audio-preview-card__play-glyph" aria-hidden="true" />
      </button>

      <div class="audio-preview-card__body">
        <div class="audio-preview-card__row">
          <span class="audio-preview-card__title">{{ title }}</span>
          <span class="audio-preview-card__duration">{{ formattedDuration }}</span>
        </div>

        <span class="audio-preview-card__time">{{ formattedCurrentTime }}</span>
      </div>

      <button v-if="showRemove" type="button" class="audio-preview-card__remove" @click="emit('remove')">
        <img :src="closeIconUrl" :alt="uk.posts.audio.remove" class="audio-preview-card__remove-icon" />
      </button>
    </div>

    <div class="audio-preview-card__progress">
      <input
          v-model="progress"
          type="range"
          min="0"
          max="100"
          step="0.1"
          class="audio-preview-card__slider"
          :style="{ '--slider-progress': `${progress}%` }"
      />
    </div>
  </div>
</template>
