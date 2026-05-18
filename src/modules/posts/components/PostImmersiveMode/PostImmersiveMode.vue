<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import PostAudioWaveform from '@/modules/posts/components/PostAudioWaveform/PostAudioWaveform.vue';
import PlayerVolumeControl from '@/modules/posts/components/PlayerVolumeControl/PlayerVolumeControl.vue';
import type { AnalysisFrame } from '@/modules/posts/interfaces/analysis-frame.interface';
import type { DecodedPostAudioAnalysis } from '@/modules/posts/interfaces/decoded-post-audio-analysis.interface';
import type { Post } from '@/modules/posts/interfaces/post.interface';
import {
  decodePostAudioAnalysis,
  getFallbackAnalysisFrame,
  readInterpolatedAnalysisFrame,
} from '@/modules/posts/utils/post-audio-analysis.utils';
import { formatPostDuration } from '@/modules/posts/utils/post-formatting.utils';
import { uk } from '@/shared/locales/uk';
import './PostImmersiveMode.css';

type VoiceGlow = {
  key: string;
  style: Record<string, string>;
};

type VoiceStroke = {
  key: string;
  style: Record<string, string>;
  isAccent: boolean;
  isWhisper: boolean;
};

type VoiceSpark = {
  key: string;
  style: Record<string, string>;
};

type SpokenMemoryLine = {
  key: string;
  text: string;
  style: Record<string, string>;
};

const props = defineProps<{
  isOpen: boolean;
  post: Post;
  currentTimeSeconds: number;
  progressPercent: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  audioElement?: HTMLAudioElement | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggle-playback'): void;
  (e: 'seek', progressPercent: number): void;
  (e: 'set-volume', volume: number): void;
  (e: 'toggle-mute'): void;
}>();

const seekInput = ref('0');
const isSeeking = ref(false);
const visualTimeSeconds = ref(0);

const smoothFrame = ref<AnalysisFrame>({
  energy: 0,
  peak: 0,
  low: 0,
  mid: 0,
  high: 0,
  zcr: 0,
});

let visualFrameId: number | null = null;
let visualStartedAt = 0;
let visualBaseTimeSeconds = 0;
let frameSkipCounter = 0;
let frameSkipModulo = 2;
let cachedAudioElement: HTMLAudioElement | null | undefined = undefined;

const maxMemoryLines = 11;
const leadingSilenceToleranceMs = 120;
const trailingSilenceToleranceMs = 160;
const accentDecayWindowMs = 520;
const accentStrokeThreshold = 0.36;
// leave (120ms) + enter (260ms) — анімація встигає закінчитись до початку рядка
const anticipationMs = 380;

const textLines = computed(() => (props.post.text ?? '').split('\n'));

const safeProgressPercent = computed(() => {
  const value = Number(props.progressPercent);

  return Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : 0;
});

const currentTimeMs = computed(() => {
  const value = Number(visualTimeSeconds.value);

  return Number.isFinite(value)
      ? Math.max(0, Math.floor(value * 1000))
      : 0;
});

const decodedAnalysis = computed<DecodedPostAudioAnalysis | null>(() => decodePostAudioAnalysis(props.post.audioAnalysis));

const currentFramePosition = computed(() => {
  const analysis = decodedAnalysis.value;

  if (!analysis?.frameMs) {
    return 0;
  }

  return currentTimeMs.value / analysis.frameMs;
});

const synchronizationLines = computed(() => props.post.textSynchronization ?? []);

const lastSynchronizedLineIndex = computed(() => {
  const synchronization = synchronizationLines.value;

  if (!synchronization.length) {
    return 0;
  }

  return synchronization[synchronization.length - 1]?.lineIndex ?? 0;
});

const leadingSilenceEndMs = computed(() => {
  const silences = props.post.audioAnalysis?.silences ?? [];

  const leadingSilence = silences.find(([startMs, endMs]) => (
      startMs <= leadingSilenceToleranceMs && endMs > leadingSilenceToleranceMs
  ));

  return leadingSilence?.[1] ?? 0;
});

const trailingSilenceStartMs = computed(() => {
  const analysis = props.post.audioAnalysis;
  const silences = analysis?.silences ?? [];
  const durationMs = analysis?.durationMs ?? Math.round((props.post.audioDurationSeconds ?? 0) * 1000);

  if (!durationMs) {
    return null;
  }

  const trailingSilence = [...silences].reverse().find(([startMs, endMs]) => (
      endMs >= durationMs - trailingSilenceToleranceMs && startMs < durationMs - trailingSilenceToleranceMs
  ));

  return trailingSilence?.[0] ?? null;
});

const activeLineIndex = computed(() => {
  const synchronization = synchronizationLines.value;

  if (!synchronization.length) {
    return 0;
  }

  const displayTimeMs = currentTimeMs.value + anticipationMs;
  let matchedLineIndex = synchronization[0]?.lineIndex ?? 0;

  for (const item of synchronization) {
    if (item.audioStartMomentMs <= displayTimeMs) {
      matchedLineIndex = item.lineIndex;
      continue;
    }

    break;
  }

  return matchedLineIndex;
});

const isAfterLastSpokenLine = computed(() => {
  const trailingStartMs = trailingSilenceStartMs.value;

  return trailingStartMs !== null
      && activeLineIndex.value >= lastSynchronizedLineIndex.value
      && currentTimeMs.value >= trailingStartMs;
});

const shouldHideActiveLine = computed(() => {
  const activeIndex = activeLineIndex.value;
  const now = currentTimeMs.value;

  const isBeforeFirstSpokenLine = activeIndex === 0
      && leadingSilenceEndMs.value > 0
      && now < leadingSilenceEndMs.value;

  return isBeforeFirstSpokenLine || isAfterLastSpokenLine.value;
});

const activeLine = computed(() => {
  if (shouldHideActiveLine.value) {
    return '';
  }

  return textLines.value[activeLineIndex.value] ?? '';
});

const getStableMemoryNumber = (seed: number, salt: number): number => {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
};

const getStableMemoryRange = (seed: number, salt: number, min: number, max: number): number => (
    min + getStableMemoryNumber(seed, salt) * (max - min)
);

const isSpokenMemoryLine = (line: SpokenMemoryLine | null): line is SpokenMemoryLine => line !== null;

const buildSpokenMemoryLines = (): SpokenMemoryLine[] => {
  const activeIndex = activeLineIndex.value;

  const spoken = synchronizationLines.value
      .filter((item) => (
          item.lineIndex < activeIndex
          || (isAfterLastSpokenLine.value && item.lineIndex === activeIndex)
      ))
      .slice(-maxMemoryLines);

  const memoryLines: Array<SpokenMemoryLine | null> = spoken.map((item, itemIndex, items) => {
    const text = textLines.value[item.lineIndex] ?? '';

    if (!text.trim()) {
      return null;
    }

    const age = items.length - itemIndex;
    const ageProgress = Math.min(1, Math.max(0, (age - 1) / Math.max(1, maxMemoryLines - 1)));
    const seed = item.lineIndex + 1;

    const side = getStableMemoryNumber(seed, 1) > 0.5 ? 1 : -1;
    const verticalZone = getStableMemoryNumber(seed, 2);

    const baseY = verticalZone < 0.34
        ? getStableMemoryRange(seed, 3, -265, -126)
        : verticalZone < 0.68
            ? getStableMemoryRange(seed, 4, 108, 250)
            : getStableMemoryRange(seed, 5, -72, 72);

    const baseX = side * getStableMemoryRange(seed, 6, 116, 360);

    const x = baseX + getStableMemoryRange(seed, 7, -46, 46);
    const y = baseY + getStableMemoryRange(seed, 8, -24, 24);
    const rotate = getStableMemoryRange(seed, 9, -12, 12);
    const stableScale = getStableMemoryRange(seed, 10, 0.9, 1.08);

    const depth = -ageProgress * 920;
    const perspectiveScale = Math.max(0.16, stableScale * (1 - ageProgress * 0.78));

    const nearOpacity = 0.62 - age * 0.045;
    const farFadePenalty = Math.max(0, age - 7) * 0.095;
    const opacity = Math.max(0, nearOpacity - farFadePenalty);

    const blur = 0.12 + ageProgress * 3.1;
    const brightness = Math.max(0.62, 1 - ageProgress * 0.28);
    const saturation = Math.max(0.72, 1 - ageProgress * 0.18);

    if (opacity < 0.035 || perspectiveScale < 0.18) {
      return null;
    }

    return {
      key: `${item.lineIndex}-${item.audioStartMomentMs}`,
      text,
      style: {
        '--memory-x': `${x}px`,
        '--memory-y': `${y}px`,
        '--memory-z': `${depth}px`,
        '--memory-rotate': `${rotate}deg`,
        '--memory-scale': String(perspectiveScale),
        '--memory-opacity': String(opacity),
        '--memory-age': String(age),
        '--memory-blur': `${blur}px`,
        '--memory-brightness': String(brightness),
        '--memory-saturation': String(saturation),
        '--memory-delay': `${Math.min(itemIndex, 4) * 24}ms`,
        '--memory-drift-x': `${getStableMemoryRange(seed, 11, -18, 18)}px`,
        '--memory-drift-y': `${getStableMemoryRange(seed, 12, -14, 14)}px`,
        '--memory-duration': `${getStableMemoryRange(seed, 13, 15, 25).toFixed(1)}s`,
      },
    };
  });

  return memoryLines.filter(isSpokenMemoryLine);
};

const spokenMemoryLines = ref<SpokenMemoryLine[]>([]);

watch([activeLineIndex, isAfterLastSpokenLine], () => {
  spokenMemoryLines.value = buildSpokenMemoryLines();
}, { immediate: true });

const currentAnalysisFrame = computed<AnalysisFrame>(() => {
  const analysis = decodedAnalysis.value;

  if (!analysis) {
    return getFallbackAnalysisFrame(visualTimeSeconds.value, props.isPlaying);
  }

  return readInterpolatedAnalysisFrame(analysis, currentFramePosition.value);
});

const nearbyAccentStrength = computed(() => {
  const analysis = props.post.audioAnalysis;

  if (!analysis?.accents?.length) {
    return 0;
  }

  const now = currentTimeMs.value;
  let strength = 0;

  for (const [accentTimeMs, accentStrength] of analysis.accents) {
    const distance = Math.abs(accentTimeMs - now);

    if (distance > accentDecayWindowMs) {
      continue;
    }

    const distanceFactor = 1 - distance / accentDecayWindowMs;
    strength = Math.max(strength, accentStrength * distanceFactor);
  }

  return Math.min(1, Math.max(0, strength));
});

const isInsideSilence = computed(() => {
  const analysis = props.post.audioAnalysis;

  if (!analysis?.silences?.length) {
    return false;
  }

  const now = currentTimeMs.value;

  return analysis.silences.some(([startMs, endMs]) => now >= startMs && now <= endMs);
});

const voiceGlows = computed<VoiceGlow[]>(() => {
  const frame = smoothFrame.value;
  const accent = nearbyAccentStrength.value;

  const presets = [
    { x: 28, y: 36, size: 34, tone: 'low', seed: 1 },
    { x: 64, y: 38, size: 42, tone: 'mid', seed: 2 },
    { x: 42, y: 58, size: 52, tone: 'high', seed: 3 },
    { x: 72, y: 61, size: 30, tone: 'low', seed: 4 },
    { x: 52, y: 43, size: 46, tone: 'mid', seed: 5 },
    { x: 35, y: 67, size: 26, tone: 'high', seed: 6 },
    { x: 78, y: 47, size: 24, tone: 'mid', seed: 7 },
  ];

  return presets.map((item) => {
    const toneValue = item.tone === 'low'
        ? frame.low
        : item.tone === 'mid'
            ? frame.mid
            : frame.high;

    const energy = Math.max(frame.energy, toneValue);
    const size = item.size + energy * 28 + accent * 10;
    const opacity = 0.16 + energy * 0.28 + accent * 0.08;

    return {
      key: `voice-glow-${item.seed}`,
      style: {
        '--field-x': `${item.x + Math.sin(item.seed * 1.7) * frame.zcr * 5}%`,
        '--field-y': `${item.y + Math.cos(item.seed * 1.2) * frame.low * 4}%`,
        '--field-size': `${size}%`,
        '--field-opacity': opacity.toFixed(3),
        '--field-tone-low': item.tone === 'low' ? '1' : '0',
        '--field-tone-mid': item.tone === 'mid' ? '1' : '0',
        '--field-tone-high': item.tone === 'high' ? '1' : '0',
        '--field-delay': `${item.seed * -0.7}s`,
      },
    };
  });
});

const voiceStrokes = computed<VoiceStroke[]>(() => {
  const frame = smoothFrame.value;
  const accent = nearbyAccentStrength.value;
  const count = window.innerWidth < 760 ? 18 : 36;

  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const cluster = index % 5;

    const baseX = [18, 30, 68, 79, 50][cluster];
    const baseY = [46, 32, 38, 58, 69][cluster];

    const spreadX = [18, 24, 21, 18, 30][cluster];
    const spreadY = [16, 13, 17, 15, 12][cluster];

    const x = baseX + Math.sin(seed * 1.93) * spreadX;
    const y = baseY + Math.cos(seed * 1.41) * spreadY;
    const rotate = Math.sin(seed * 0.77) * 58 + (cluster - 2) * 14;

    const lowWeight = cluster === 0 || cluster === 3 ? 0.58 : 0.22;
    const midWeight = cluster === 1 || cluster === 4 ? 0.62 : 0.3;
    const highWeight = cluster === 2 ? 0.72 : 0.24;
    const peakWeight = index % 7 === 0 ? 0.52 : 0.2;

    const rawLevel = (
        frame.energy * 0.22 +
        frame.low * lowWeight +
        frame.mid * midWeight +
        frame.high * highWeight +
        frame.peak * peakWeight
    ) / 1.9;

    const level = Math.min(1, Math.max(0.035, Math.pow(rawLevel, 0.72)));
    const isAccent = accent > accentStrokeThreshold && index % 6 === 0;
    const isWhisper = frame.high > frame.low && index % 3 === 0;

    const length = 22 + level * 72 + accent * (isAccent ? 32 : 10);
    const thickness = 1.4 + level * 2.8 + (isAccent ? accent * 1.5 : 0);
    const opacity = Math.min(0.82, 0.12 + level * 0.52 + accent * (isAccent ? 0.22 : 0.08));

    return {
      key: `voice-stroke-${index}`,
      isAccent,
      isWhisper,
      style: {
        '--stroke-x': `${x}%`,
        '--stroke-y': `${y}%`,
        '--stroke-rotate': `${rotate}deg`,
        '--stroke-length': `${length}px`,
        '--stroke-thickness': `${thickness}px`,
        '--stroke-opacity': opacity.toFixed(3),
        '--stroke-level': level.toFixed(3),
        '--stroke-low': Math.min(1, frame.low * lowWeight).toFixed(3),
        '--stroke-mid': Math.min(1, frame.mid * midWeight).toFixed(3),
        '--stroke-high': Math.min(1, frame.high * highWeight).toFixed(3),
        '--stroke-peak': Math.min(1, frame.peak * peakWeight).toFixed(3),
        '--stroke-drift-x': `${Math.sin(seed * 2.1) * 6}px`,
        '--stroke-drift-y': `${Math.cos(seed * 1.6) * 5}px`,
        '--stroke-delay': `${(seed % 9) * -0.6}s`,
      },
    };
  });
});

const voiceSparks = computed<VoiceSpark[]>(() => {
  const frame = smoothFrame.value;
  const accent = nearbyAccentStrength.value;
  const count = 10;

  return Array.from({ length: count }, (_, index) => {
    const seed = index + 1;
    const x = 50 + Math.sin(seed * 2.37) * (18 + frame.zcr * 12);
    const y = 50 + Math.cos(seed * 1.81) * (16 + frame.high * 14);
    const scale = 0.4 + accent * 1.6 + frame.peak * 0.7;
    const opacity = Math.max(0, accent * 0.72 + frame.peak * 0.18 - 0.16);

    return {
      key: `voice-spark-${index}`,
      style: {
        '--spark-x': `${x}%`,
        '--spark-y': `${y}%`,
        '--spark-size': `${3 + frame.high * 8 + accent * 6}px`,
        '--spark-scale': scale.toFixed(3),
        '--spark-opacity': opacity.toFixed(3),
        '--spark-delay': `${seed * -0.11}s`,
      },
    };
  });
});

const sceneAudioStyle = computed(() => {
  const frame = smoothFrame.value;
  const silenceFactor = isInsideSilence.value ? 0.54 : 1;
  const accent = nearbyAccentStrength.value;

  const low = frame.low * silenceFactor;
  const mid = frame.mid * silenceFactor;
  const high = frame.high * silenceFactor;
  const energy = frame.energy * silenceFactor;
  const peak = Math.max(frame.peak, accent * 0.94) * silenceFactor;
  const totalTone = Math.max(0.001, low + mid + high);

  return {
    '--audio-energy': energy.toFixed(3),
    '--audio-peak': peak.toFixed(3),
    '--audio-low': low.toFixed(3),
    '--audio-mid': mid.toFixed(3),
    '--audio-high': high.toFixed(3),
    '--audio-zcr': (frame.zcr * silenceFactor).toFixed(3),
    '--audio-accent': accent.toFixed(3),
    '--tone-low': (low / totalTone).toFixed(3),
    '--tone-mid': (mid / totalTone).toFixed(3),
    '--tone-high': (high / totalTone).toFixed(3),
    '--silence': isInsideSilence.value ? '1' : '0',
    '--line-presence': shouldHideActiveLine.value ? '0' : '1',
  };
});

const totalDuration = computed(() => formatPostDuration(props.post.audioDurationSeconds));
const currentTime = computed(() => formatPostDuration(visualTimeSeconds.value));

const smoothAudioFrame = (target: AnalysisFrame): void => {
  const previous = smoothFrame.value;

  const smooth = (current: number, next: number, attack = 0.16, release = 0.08): number => {
    const speed = next > current ? attack : release;

    return current + (next - current) * speed;
  };

  smoothFrame.value = {
    energy: smooth(previous.energy, target.energy, 0.13, 0.07),
    low: smooth(previous.low, target.low, 0.1, 0.055),
    mid: smooth(previous.mid, target.mid, 0.14, 0.07),
    high: smooth(previous.high, target.high, 0.11, 0.055),
    zcr: smooth(previous.zcr, target.zcr, 0.1, 0.05),
    peak: smooth(previous.peak, target.peak, 0.3, 0.065),
  };
};

const resolveAudioElement = (): HTMLAudioElement | null => {
  if (props.audioElement) {
    return props.audioElement;
  }

  if (cachedAudioElement !== undefined) {
    return cachedAudioElement;
  }

  const element = document.querySelector('audio');
  cachedAudioElement = element instanceof HTMLAudioElement ? element : null;

  return cachedAudioElement;
};

const stopVisualClock = (): void => {
  if (visualFrameId !== null) {
    cancelAnimationFrame(visualFrameId);
    visualFrameId = null;
  }
};

const startVisualClock = (): void => {
  stopVisualClock();
  frameSkipCounter = 0;
  frameSkipModulo = window.innerWidth < 760 ? 3 : 2;

  visualBaseTimeSeconds = Number.isFinite(Number(props.currentTimeSeconds))
      ? Number(props.currentTimeSeconds)
      : 0;

  visualTimeSeconds.value = visualBaseTimeSeconds;
  visualStartedAt = performance.now();

  const tick = (timestamp: number): void => {
    if (!props.isOpen) {
      visualFrameId = null;
      return;
    }

    const audioElement = resolveAudioElement();

    if (audioElement && Number.isFinite(audioElement.currentTime)) {
      visualTimeSeconds.value = audioElement.currentTime;
    } else if (props.isPlaying) {
      visualTimeSeconds.value = visualBaseTimeSeconds + (timestamp - visualStartedAt) / 1000;
    } else {
      const propTime = Number(props.currentTimeSeconds);

      if (Number.isFinite(propTime)) {
        visualTimeSeconds.value = propTime;
      }
    }

    frameSkipCounter = (frameSkipCounter + 1) % frameSkipModulo;

    if (frameSkipCounter === 0) {
      smoothAudioFrame(currentAnalysisFrame.value);
    }

    visualFrameId = requestAnimationFrame(tick);
  };

  visualFrameId = requestAnimationFrame(tick);
};

const handleSeekInput = (): void => {
  isSeeking.value = true;
};

const handleSeekCommit = (): void => {
  isSeeking.value = false;
  emit('seek', Number(seekInput.value));
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (!props.isOpen) {
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }

  if (event.key === ' ' && event.target === document.body) {
    event.preventDefault();
    emit('toggle-playback');
  }
};

watch(() => safeProgressPercent.value, (progressPercent) => {
  if (!isSeeking.value) {
    seekInput.value = String(progressPercent);
  }
}, { immediate: true });

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    seekInput.value = String(safeProgressPercent.value);
    isSeeking.value = false;
    smoothFrame.value = currentAnalysisFrame.value;
    startVisualClock();
    return;
  }

  stopVisualClock();
});

watch(() => props.isPlaying, () => {
  if (props.isOpen) {
    startVisualClock();
  }
});

watch(() => props.audioElement, () => {
  cachedAudioElement = undefined;
});

watch(() => props.currentTimeSeconds, (time) => {
  if (!props.isOpen || props.isPlaying) {
    return;
  }

  const value = Number(time);

  if (Number.isFinite(value)) {
    visualTimeSeconds.value = value;
    smoothFrame.value = currentAnalysisFrame.value;
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);

  if (props.isOpen) {
    smoothFrame.value = currentAnalysisFrame.value;
    startVisualClock();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  stopVisualClock();
  cachedAudioElement = undefined;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="post-immersive-mode">
      <section
          v-if="isOpen"
          class="post-immersive-mode post-immersive-mode--voice-field"
          :class="{
            'post-immersive-mode--playing': isPlaying,
            'post-immersive-mode--silence': isInsideSilence,
            'post-immersive-mode--line-hidden': shouldHideActiveLine,
          }"
          :style="sceneAudioStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="uk.posts.details.immersiveTitle"
      >
        <div class="post-immersive-mode__scene" aria-hidden="true">
          <span class="post-immersive-mode__paper-field" />
          <span class="post-immersive-mode__spotlight" />
          <span class="post-immersive-mode__ink post-immersive-mode__ink--one" />
          <span class="post-immersive-mode__ink post-immersive-mode__ink--two" />
          <span class="post-immersive-mode__grain" />
        </div>

        <header class="post-immersive-mode__topbar">
          <div class="post-immersive-mode__meta">
            <span class="post-immersive-mode__kicker">{{ uk.posts.details.immersiveSceneKicker }}</span>
            <strong class="post-immersive-mode__title">{{ post.title || uk.posts.details.untitled }}</strong>
          </div>

          <button
              type="button"
              class="post-immersive-mode__close"
              :aria-label="uk.common.labels.close"
              @click="emit('close')"
          >
            <img :src="closeIconUrl" alt="" />
          </button>
        </header>

        <main class="post-immersive-mode__stage">
          <div class="post-immersive-mode__memory-field" aria-hidden="true">
            <p
                v-for="line in spokenMemoryLines"
                :key="line.key"
                class="post-immersive-mode__memory-line"
                :style="line.style"
            >
              {{ line.text }}
            </p>
          </div>

          <section class="post-immersive-mode__focus">
            <div class="post-immersive-mode__voice-field" aria-hidden="true">
              <span
                  v-for="glow in voiceGlows"
                  :key="glow.key"
                  class="post-immersive-mode__voice-glow"
                  :style="glow.style"
              />

              <span
                  v-for="stroke in voiceStrokes"
                  :key="stroke.key"
                  class="post-immersive-mode__voice-stroke"
                  :class="{
                    'post-immersive-mode__voice-stroke--accent': stroke.isAccent,
                    'post-immersive-mode__voice-stroke--whisper': stroke.isWhisper,
                  }"
                  :style="stroke.style"
              />

              <span
                  v-for="spark in voiceSparks"
                  :key="spark.key"
                  class="post-immersive-mode__voice-spark"
                  :style="spark.style"
              />
            </div>

            <Transition name="post-immersive-current-line" mode="out-in">
              <p
                  v-if="activeLine"
                  :key="activeLineIndex"
                  class="post-immersive-mode__current-line"
              >
                {{ activeLine }}
              </p>
              <span
                  v-else
                  key="silent-line"
                  class="post-immersive-mode__silent-line"
                  aria-hidden="true"
              />
            </Transition>
          </section>
        </main>

        <footer class="post-immersive-mode__controls">
          <button
              type="button"
              class="post-immersive-mode__play audio-play-button"
              :class="{ 'audio-play-button--active': isPlaying }"
              :aria-label="isPlaying ? uk.posts.audio.pause : uk.posts.audio.play"
              @click="emit('toggle-playback')"
          >
            <img v-if="isPlaying" :src="pauseLightIconUrl" alt="" class="audio-play-button__pause-icon" />
            <img v-else :src="playIconUrl" :alt="uk.posts.audio.play" class="audio-play-button__play-icon" />
          </button>

          <div class="post-immersive-mode__seek">
            <span>{{ currentTime }}</span>
            <PostAudioWaveform
                :model-value="Number(seekInput)"
                :audio-analysis="post.audioAnalysis"
                :duration-seconds="post.audioDurationSeconds ?? undefined"
                :is-playing="isPlaying"
                :ariaLabel="uk.posts.details.immersiveSeek"
                @update:model-value="seekInput = String($event); handleSeekInput()"
                @change="seekInput = String($event); handleSeekCommit()"
            />
            <span>{{ totalDuration }}</span>
          </div>

          <PlayerVolumeControl
              :volume="volume"
              :is-muted="isMuted"
              class="post-immersive-mode__volume"
              @set-volume="emit('set-volume', $event)"
              @toggle-mute="emit('toggle-mute')"
          />
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>
