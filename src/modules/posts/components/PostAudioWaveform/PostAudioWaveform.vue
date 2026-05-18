<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PostAudioAnalysis } from '@/modules/posts/interfaces/post-audio-analysis.interface';
import { formatSecondsToClock } from '@/shared/utils/time.utils';
import './PostAudioWaveform.css';

const props = defineProps<{
    modelValue: number;
    durationSeconds?: number;
    audioAnalysis?: PostAudioAnalysis | null;
    audioEnergy?: number;
    isPlaying?: boolean;
    ariaLabel: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
    (e: 'change', value: number): void;
}>();

const BAR_COUNT = 160;
const SVG_WIDTH = 400;
const SVG_HEIGHT = 40;
const CENTER_Y = SVG_HEIGHT / 2;
const BAR_MAX_HALF_H = (SVG_HEIGHT / 2) * 0.86;
const BAR_W = (SVG_WIDTH / BAR_COUNT) * 0.6;
const BAR_STEP = SVG_WIDTH / BAR_COUNT;
const MIN_HALF_H = 1.5;

const uid = `paw-${Math.random().toString(36).slice(2, 8)}`;

const hoverX = ref<number | null>(null);
const rootRef = ref<HTMLElement | null>(null);

const waveformSamples = computed((): readonly number[] => {
    const raw = props.audioAnalysis?.waveform;

    if (!raw) {
        return [];
    }

    try {
        const binary = window.atob(raw);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }

        if (!bytes.length) {
            return [];
        }

        const step = bytes.length / BAR_COUNT;
        const result: number[] = new Array(BAR_COUNT);

        for (let i = 0; i < BAR_COUNT; i += 1) {
            const start = Math.floor(i * step);
            const end = Math.min(bytes.length, Math.floor((i + 1) * step));
            let max = 0;

            for (let j = start; j < end; j += 1) {
                const v = bytes[j] ?? 0;

                if (v > max) {
                    max = v;
                }
            }

            result[i] = max / 255;
        }

        return result;
    } catch {
        return [];
    }
});

const progressX = computed(() =>
    (Math.min(100, Math.max(0, props.modelValue)) / 100) * SVG_WIDTH,
);

const glowOpacity = computed(() => {
    if (!props.isPlaying) {
        return 0;
    }

    return Math.min(0.2, (props.audioEnergy ?? 0) * 0.2);
});

const hoverPercent = computed(() => {
    if (hoverX.value === null || !rootRef.value) {
        return null;
    }

    return Math.min(100, Math.max(0, (hoverX.value / rootRef.value.clientWidth) * 100));
});

const hoverSvgX = computed(() => {
    if (hoverPercent.value === null) {
        return null;
    }

    return (hoverPercent.value / 100) * SVG_WIDTH;
});

const hoverTimeLabel = computed(() => {
    if (hoverPercent.value === null || !props.durationSeconds) {
        return null;
    }

    return formatSecondsToClock((hoverPercent.value / 100) * props.durationSeconds);
});

const handleMouseMove = (event: MouseEvent): void => {
    if (!rootRef.value) {
        return;
    }

    const rect = rootRef.value.getBoundingClientRect();
    hoverX.value = event.clientX - rect.left;
};

const handleMouseLeave = (): void => {
    hoverX.value = null;
};

const handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
        return;
    }

    emit('update:modelValue', Number(target.value));
};
</script>

<template>
  <div
      ref="rootRef"
      class="post-audio-waveform"
      :class="{ 'post-audio-waveform--hover': hoverX !== null }"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
  >
    <svg
        class="post-audio-waveform__svg"
        :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
        preserveAspectRatio="none"
        aria-hidden="true"
    >
      <defs>
        <clipPath :id="`${uid}-played`">
          <rect x="0" y="0" :width="progressX" :height="SVG_HEIGHT" />
        </clipPath>
        <clipPath :id="`${uid}-unplayed`">
          <rect :x="progressX" y="0" :width="SVG_WIDTH - progressX" :height="SVG_HEIGHT" />
        </clipPath>
        <clipPath :id="`${uid}-hover-left`">
          <rect x="0" y="0" :width="hoverSvgX ?? 0" :height="SVG_HEIGHT" />
        </clipPath>
      </defs>

      <!-- Energy glow behind played section -->
      <rect
          v-if="glowOpacity > 0.005"
          x="0"
          y="0"
          :width="progressX"
          :height="SVG_HEIGHT"
          class="post-audio-waveform__glow"
          :style="{ opacity: glowOpacity }"
      />

      <template v-if="waveformSamples.length">
        <!-- Unplayed bars -->
        <g :clip-path="`url(#${uid}-unplayed)`" class="post-audio-waveform__bars--unplayed">
          <rect
              v-for="(s, i) in waveformSamples"
              :key="i"
              :x="i * BAR_STEP + (BAR_STEP - BAR_W) / 2"
              :y="CENTER_Y - Math.max(MIN_HALF_H, s * BAR_MAX_HALF_H)"
              :width="BAR_W"
              :height="Math.max(MIN_HALF_H * 2, s * BAR_MAX_HALF_H * 2)"
              rx="0.8"
          />
        </g>

        <!-- Played bars -->
        <g :clip-path="`url(#${uid}-played)`" class="post-audio-waveform__bars--played">
          <rect
              v-for="(s, i) in waveformSamples"
              :key="i"
              :x="i * BAR_STEP + (BAR_STEP - BAR_W) / 2"
              :y="CENTER_Y - Math.max(MIN_HALF_H, s * BAR_MAX_HALF_H)"
              :width="BAR_W"
              :height="Math.max(MIN_HALF_H * 2, s * BAR_MAX_HALF_H * 2)"
              rx="0.8"
          />
        </g>

        <!-- Hover preview bars (filled to hover position) -->
        <g
            v-if="hoverSvgX !== null && hoverSvgX > progressX"
            :clip-path="`url(#${uid}-hover-left)`"
            class="post-audio-waveform__bars--hover"
        >
          <rect
              v-for="(s, i) in waveformSamples"
              :key="i"
              :x="i * BAR_STEP + (BAR_STEP - BAR_W) / 2"
              :y="CENTER_Y - Math.max(MIN_HALF_H, s * BAR_MAX_HALF_H)"
              :width="BAR_W"
              :height="Math.max(MIN_HALF_H * 2, s * BAR_MAX_HALF_H * 2)"
              rx="0.8"
          />
        </g>

        <!-- Playhead line -->
        <line
            v-if="progressX > 1 && progressX < SVG_WIDTH - 1"
            :x1="progressX"
            y1="0"
            :x2="progressX"
            :y2="SVG_HEIGHT"
            class="post-audio-waveform__playhead"
        />

        <!-- Hover ghost line -->
        <line
            v-if="hoverSvgX !== null"
            :x1="hoverSvgX"
            y1="0"
            :x2="hoverSvgX"
            :y2="SVG_HEIGHT"
            class="post-audio-waveform__hover-line"
        />
      </template>

      <template v-else>
        <rect
            x="0"
            :y="CENTER_Y - 1.5"
            :width="SVG_WIDTH"
            height="3"
            rx="1.5"
            class="post-audio-waveform__flat-track"
        />
        <rect
            x="0"
            :y="CENTER_Y - 1.5"
            :width="progressX"
            height="3"
            rx="1.5"
            class="post-audio-waveform__flat-progress"
        />
        <line
            v-if="hoverSvgX !== null"
            :x1="hoverSvgX"
            y1="0"
            :x2="hoverSvgX"
            :y2="SVG_HEIGHT"
            class="post-audio-waveform__hover-line"
        />
      </template>
    </svg>

    <!-- Hover time tooltip -->
    <span
        v-if="hoverTimeLabel !== null && hoverX !== null && rootRef"
        class="post-audio-waveform__tooltip"
        :style="{ left: `${Math.min(rootRef.clientWidth - 36, Math.max(0, hoverX - 18))}px` }"
        aria-hidden="true"
    >
      {{ hoverTimeLabel }}
    </span>

    <input
        type="range"
        class="post-audio-waveform__input"
        min="0"
        max="100"
        step="0.1"
        :value="modelValue"
        :aria-label="ariaLabel"
        @input="handleInput"
        @change="emit('change', Number(($event.target as HTMLInputElement).value))"
    />
  </div>
</template>
