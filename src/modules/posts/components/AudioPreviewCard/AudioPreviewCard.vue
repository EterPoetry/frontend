<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import AudioProgressBar from '@/shared/components/AudioProgressBar/AudioProgressBar.vue';
import { AudioPreviewCardProps } from '@/modules/posts/interfaces/audio-preview-card-props.interface';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';
import './AudioPreviewCard.css';

const props = withDefaults(defineProps<AudioPreviewCardProps>(), {
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
          class="audio-preview-card__play audio-play-button"
          :class="{ 'audio-play-button--active': isPlaying }"
          :aria-label="isPlaying ? uk.posts.audio.pause : uk.posts.audio.play"
          @click="togglePlayback"
      >
        <img v-if="isPlaying" :src="pauseLightIconUrl" alt="" class="audio-play-button__pause-icon" />
        <img v-else :src="playIconUrl" :alt="uk.posts.audio.play" class="audio-play-button__play-icon" />
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
      <AudioProgressBar
          v-model="progress"
          :ariaLabel="uk.posts.player.seek"
          density="default"
          :disabled="disabled"
      />
    </div>
  </div>
</template>
