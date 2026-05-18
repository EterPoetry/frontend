<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import PostAudioWaveform from '@/modules/posts/components/PostAudioWaveform/PostAudioWaveform.vue';
import PlayerVolumeControl from '@/modules/posts/components/PlayerVolumeControl/PlayerVolumeControl.vue';
import { usePostImmersiveModeLines } from '@/modules/posts/composables/usePostImmersiveModeLines';
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

type GlowPreset = { x: number; y: number; baseSize: number; tone: 'low' | 'mid' | 'high'; seed: number };
const GLOW_PRESETS: GlowPreset[] = [
  { x: 0.28, y: 0.36, baseSize: 34, tone: 'low', seed: 1 },
  { x: 0.64, y: 0.38, baseSize: 42, tone: 'mid', seed: 2 },
  { x: 0.42, y: 0.58, baseSize: 52, tone: 'high', seed: 3 },
  { x: 0.72, y: 0.61, baseSize: 30, tone: 'low', seed: 4 },
  { x: 0.52, y: 0.43, baseSize: 46, tone: 'mid', seed: 5 },
  { x: 0.35, y: 0.67, baseSize: 26, tone: 'high', seed: 6 },
  { x: 0.78, y: 0.47, baseSize: 24, tone: 'mid', seed: 7 },
];

type StrokePreset = {
  x: number; y: number; rotate: number;
  lowW: number; midW: number; highW: number; peakW: number;
  isAccentCandidate: boolean; isWhisperCandidate: boolean;
  driftX: number; driftY: number; driftDelay: number;
};

const buildStrokePresets = (): StrokePreset[] =>
  Array.from({ length: 36 }, (_, i) => {
    const seed = i + 1;
    const cluster = i % 5;
    const bx = [18, 30, 68, 79, 50][cluster];
    const by = [46, 32, 38, 58, 69][cluster];
    const sx = [18, 24, 21, 18, 30][cluster];
    const sy = [16, 13, 17, 15, 12][cluster];
    return {
      x: (bx + Math.sin(seed * 1.93) * sx) / 100,
      y: (by + Math.cos(seed * 1.41) * sy) / 100,
      rotate: (Math.sin(seed * 0.77) * 58 + (cluster - 2) * 14) * (Math.PI / 180),
      lowW:  cluster === 0 || cluster === 3 ? 0.58 : 0.22,
      midW:  cluster === 1 || cluster === 4 ? 0.62 : 0.30,
      highW: cluster === 2 ? 0.72 : 0.24,
      peakW: i % 7 === 0 ? 0.52 : 0.20,
      isAccentCandidate: i % 6 === 0,
      isWhisperCandidate: i % 3 === 0,
      driftX: Math.sin(seed * 2.1) * 6,
      driftY: Math.cos(seed * 1.6) * 5,
      driftDelay: (seed % 9) * -600,
    };
  });
const STROKE_PRESETS = buildStrokePresets();

type RGB = [number, number, number];
type CanvasColors = {
  toneLow: RGB; toneMid: RGB; toneHigh: RGB;
  bgBase: string; bgMid: string; bgEnd: string;
  accent1: RGB; accent1A: number;
  accent2: RGB; accent2A: number;
  grain: RGB; grainMode: GlobalCompositeOperation;
};
const DARK_COLORS: CanvasColors = {
  toneLow: [176, 91, 67], toneMid: [199, 126, 82], toneHigh: [236, 202, 154],
  bgBase: '#0b090b', bgMid: '#21161d', bgEnd: '#070607',
  accent1: [230, 179, 118], accent1A: 0.12,
  accent2: [174, 89, 67], accent2A: 0.16,
  grain: [255, 247, 236], grainMode: 'soft-light',
};
const LIGHT_COLORS: CanvasColors = {
  toneLow: [151, 79, 48], toneMid: [184, 107, 63], toneHigh: [214, 158, 97],
  bgBase: '#fff9f1', bgMid: '#efe0cc', bgEnd: '#fff7ef',
  accent1: [190, 112, 64], accent1A: 0.11,
  accent2: [224, 185, 132], accent2A: 0.28,
  grain: [72, 48, 34], grainMode: 'multiply',
};

const rgbaOf = (c: RGB, a: number): string =>
  `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
const getColors = (): CanvasColors =>
  document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT_COLORS : DARK_COLORS;

const drawBackground = (
  ctx: CanvasRenderingContext2D, w: number, h: number,
  frame: AnalysisFrame, accent: number, silence: boolean, c: CanvasColors,
): void => {
  const sf = silence ? 0.54 : 1;
  const energy = frame.energy * sf;
  const low = frame.low * sf, mid = frame.mid * sf, high = frame.high * sf;
  const totalTone = Math.max(0.001, low + mid + high);
  const tnLow = low / totalTone, tnMid = mid / totalTone, tnHigh = high / totalTone;
  const yOffset = low * -8;

  const bg = ctx.createLinearGradient(0, 0, w * 0.7, h);
  bg.addColorStop(0, c.bgBase);
  bg.addColorStop(0.5, c.bgMid);
  bg.addColorStop(1, c.bgEnd);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const r1 = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, w * 0.32);
  r1.addColorStop(0, rgbaOf(c.accent1, c.accent1A));
  r1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, w, h);

  const r2 = ctx.createRadialGradient(w * 0.14, h * 0.84, 0, w * 0.14, h * 0.84, w * 0.32);
  r2.addColorStop(0, rgbaOf(c.accent2, c.accent2A));
  r2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r2;
  ctx.fillRect(0, 0, w, h);

  const paperA = Math.max(0, 0.64 + energy * 0.22 - (silence ? 0.16 : 0));
  const pr = Math.max(w, h) * (0.5 + energy * 0.007);
  const paper = ctx.createRadialGradient(w * 0.5, h * 0.46 + yOffset, 0, w * 0.5, h * 0.46 + yOffset, pr);
  paper.addColorStop(0,    rgbaOf(c.toneHigh, tnHigh * 0.18 * paperA));
  paper.addColorStop(0.36, rgbaOf(c.toneMid,  tnMid  * 0.19 * paperA));
  paper.addColorStop(0.58, rgbaOf(c.toneLow,  tnLow  * 0.16 * paperA));
  paper.addColorStop(0.78, 'rgba(0,0,0,0)');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  const spotA = Math.max(0, 0.42 + mid * 0.36 + accent * 0.22 - (silence ? 0.14 : 0));
  const blendR = c.toneLow[0]*tnLow*0.22 + c.toneMid[0]*tnMid*0.30 + c.toneHigh[0]*tnHigh*0.26;
  const blendG = c.toneLow[1]*tnLow*0.22 + c.toneMid[1]*tnMid*0.30 + c.toneHigh[1]*tnHigh*0.26;
  const blendB = c.toneLow[2]*tnLow*0.22 + c.toneMid[2]*tnMid*0.30 + c.toneHigh[2]*tnHigh*0.26;
  const spot = ctx.createRadialGradient(w * 0.5, h * 0.44 + yOffset, 0, w * 0.5, h * 0.44 + yOffset, Math.max(w, h) * 0.42);
  spot.addColorStop(0, `rgba(${Math.round(blendR)},${Math.round(blendG)},${Math.round(blendB)},${spotA.toFixed(3)})`);
  spot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.filter = 'blur(24px)';
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};

const drawInk = (
  ctx: CanvasRenderingContext2D, w: number, h: number,
  frame: AnalysisFrame, silence: boolean, time: number, c: CanvasColors,
): void => {
  const period = 20000;
  const inkSize = Math.min(w, h) * 0.5;
  const scale = 0.98 + frame.low * 0.06;

  const t1 = (time % period) / period;
  const a1 = Math.max(0, 0.2 + frame.low * 0.2 - (silence ? 0.08 : 0));
  const dx1 = Math.sin(t1 * Math.PI * 2) * w * 0.07;
  const dy1 = Math.sin(t1 * Math.PI * 2 + 1) * h * -0.04;
  const cx1 = -inkSize * 0.28 + dx1;
  const cy1 = -inkSize * 0.36 + dy1;
  const gr1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, inkSize * 0.5 * scale);
  gr1.addColorStop(0,    rgbaOf(c.toneLow, 0.2 * a1));
  gr1.addColorStop(0.68, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr1;
  ctx.fillRect(0, 0, w, h);

  const t2 = ((time + 9000) % period) / period;
  const a2 = Math.max(0, 0.18 + frame.high * 0.18 - (silence ? 0.08 : 0));
  const dx2 = Math.sin(t2 * Math.PI * 2) * w * 0.07;
  const dy2 = Math.sin(t2 * Math.PI * 2 + 1) * h * -0.04;
  const cx2 = w + inkSize * 0.32 + dx2;
  const cy2 = h + inkSize * 0.36 + dy2;
  const gr2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, inkSize * 0.5 * scale);
  gr2.addColorStop(0,    `rgba(232,190,132,${(0.16 * a2).toFixed(3)})`);
  gr2.addColorStop(0.68, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr2;
  ctx.fillRect(0, 0, w, h);
};

const drawVoiceGlows = (
  ctx: CanvasRenderingContext2D, w: number, h: number,
  frame: AnalysisFrame, accent: number, time: number, c: CanvasColors,
): void => {
  for (const p of GLOW_PRESETS) {
    const toneV = p.tone === 'low' ? frame.low : p.tone === 'mid' ? frame.mid : frame.high;
    const energy = Math.max(frame.energy, toneV);
    const sizePct = p.baseSize + energy * 28 + accent * 10;
    const opacity = 0.16 + energy * 0.28 + accent * 0.08;
    const color   = p.tone === 'low' ? c.toneLow : p.tone === 'mid' ? c.toneMid : c.toneHigh;

    const cx = (p.x + Math.sin(p.seed * 1.7) * frame.zcr * 0.05) * w;
    const cy = (p.y + Math.cos(p.seed * 1.2) * frame.low * 0.04) * h;
    const rx = w * sizePct / 200;
    const ry = rx / 1.4;
    const breathPhase = (((time + p.seed * -700) % 11000) / 11000) * Math.PI * 2;
    const breathScale = 1.01 - Math.cos(breathPhase) * 0.07;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(breathScale, (ry / rx) * breathScale);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0,   rgbaOf(color, opacity));
    gr.addColorStop(0.6, rgbaOf(color, opacity * 0.35));
    gr.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const fillCapsule = (ctx: CanvasRenderingContext2D, cx: number, cy: number, halfLen: number, halfH: number): void => {
  const r = halfH;
  ctx.beginPath();
  ctx.arc(cx - halfLen + r, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.arc(cx + halfLen - r, cy, r, -(Math.PI / 2), Math.PI / 2);
  ctx.closePath();
};

const drawVoiceStrokes = (
  ctx: CanvasRenderingContext2D, w: number, h: number,
  frame: AnalysisFrame, accent: number, silence: boolean,
  time: number, isMobile: boolean, c: CanvasColors,
): void => {
  const sf = silence ? 0.54 : 1;
  const count = isMobile ? 18 : STROKE_PRESETS.length;

  for (const p of STROKE_PRESETS.slice(0, count)) {
    const rawLevel = (
      frame.energy * 0.22 * sf +
      frame.low  * p.lowW  * sf +
      frame.mid  * p.midW  * sf +
      frame.high * p.highW * sf +
      frame.peak * p.peakW * sf
    ) / 1.9;
    const level   = Math.min(1, Math.max(0.035, Math.pow(rawLevel, 0.72)));
    const isAccent = accent > accentStrokeThreshold && p.isAccentCandidate;
    const isWhisper = frame.high > frame.low && p.isWhisperCandidate;

    const mobileScale = isMobile ? 0.72 : 1;
    const halfLen   = ((22 + level * 72 + accent * (isAccent ? 32 : 10)) * mobileScale) / 2;
    const halfH     = ((1.4 + level * 2.8 + (isAccent ? accent * 1.5 : 0)) * (isWhisper ? 0.72 : 1)) / 2;
    const opacity   = Math.min(0.82, 0.12 + level * 0.52 + accent * (isAccent ? 0.22 : 0.08)) * (isWhisper ? 0.82 : 1);
    const scaleX    = 0.72 + level * 0.54;

    const driftT = (((time + p.driftDelay) % 8000) + 8000) % 8000 / 8000;
    const driftScale = driftT <= 0.42
        ? driftT / 0.42
        : driftT <= 0.76
            ? 1 + ((driftT - 0.42) / 0.34) * -1.55
            : -0.55 + ((driftT - 0.76) / 0.24) * 0.55;
    const dx = p.driftX * driftScale;
    const dy = p.driftY * (driftT <= 0.42 ? driftScale : driftT <= 0.76 ? 1 + ((driftT - 0.42) / 0.34) * -0.3 : 0.7 + ((driftT - 0.76) / 0.24) * -0.7);

    const cx = p.x * w + dx;
    const cy = p.y * h + dy;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.rotate);
    ctx.scale(scaleX, 1);
    ctx.filter = isWhisper ? 'blur(0.2px)' : 'none';

    const gr = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    if (isAccent) {
      gr.addColorStop(0.3, rgbaOf(c.toneHigh, opacity));
      gr.addColorStop(0.7, rgbaOf(c.toneMid,  opacity));
    } else {
      gr.addColorStop(0.3, rgbaOf(c.toneMid,  opacity));
      gr.addColorStop(0.7, rgbaOf(c.toneLow,  opacity * 0.6));
    }
    gr.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gr;

    if (isAccent) {
      ctx.shadowBlur  = Math.min(16, 8 + accent * 12);
      ctx.shadowColor = rgbaOf(c.toneHigh, 0.36);
    } else {
      ctx.shadowBlur  = Math.min(10, 4 + frame.peak * 8);
      ctx.shadowColor = rgbaOf(c.toneMid, 0.22);
    }

    fillCapsule(ctx, 0, 0, halfLen, halfH);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
  }
};

const drawVoiceSparks = (
  ctx: CanvasRenderingContext2D, w: number, h: number,
  frame: AnalysisFrame, accent: number, time: number, c: CanvasColors,
): void => {
  for (let i = 0; i < 10; i++) {
    const s   = i + 1;
    const opacity = Math.max(0, accent * 0.72 + frame.peak * 0.18 - 0.16);
    if (opacity <= 0.005) continue;

    const x     = 0.5 + Math.sin(s * 2.37) * (0.18 + frame.zcr * 0.12);
    const y     = 0.5 + Math.cos(s * 1.81) * (0.16 + frame.high * 0.14);
    const r     = ((3 + frame.high * 8 + accent * 6) / 2) * (0.4 + accent * 1.6 + frame.peak * 0.7);
    const phase = ((time + s * -110) % 680) / 680;
    const bloom = 1 + Math.sin(phase * Math.PI * 2) * 0.15;

    ctx.save();
    ctx.shadowBlur  = 12;
    ctx.shadowColor = rgbaOf(c.toneMid, opacity * 0.3);
    ctx.fillStyle   = rgbaOf(c.toneHigh, opacity);
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x * w, y * h, Math.max(0.5, r * bloom), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
  }
};

type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const drawGrain = (
  ctx: CanvasRenderingContext2D, w: number, h: number, frame: AnalysisFrame, c: CanvasColors,
): void => {
  const opacity = 0.065 + frame.high * 0.055;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = c.grainMode;
  ctx.fillStyle = rgbaOf(c.grain, 0.5);

  for (let x = 0; x < w; x += 4) {
    for (let y = 0; y < h; y += 4) {
      if (((x * 13 + y * 7) % 17) < 5) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  for (let x = 0; x < w; x += 132) {
    ctx.fillRect(x, 0, 1, h);
  }

  ctx.restore();
};

const drawFocusVoiceField = (
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  frame: AnalysisFrame,
  accent: number,
  silence: boolean,
  linePresence: number,
  time: number,
  c: CanvasColors,
): void => {
  const silenceFactor = silence ? 0.54 : 1;
  const energy = frame.energy * silenceFactor;
  const opacity = Math.max(0, (0.72 + energy * 0.14 - (silence ? 0.16 : 0)) * (0.52 + linePresence * 0.48));
  const scale = 0.99 + energy * 0.01 + accent * 0.014;
  const isMobile = window.innerWidth < 760;
  const insetX = rect.width * (isMobile ? 0.1 : 0.05);
  const insetY = rect.height * 0.1;
  const field = {
    x: rect.x - insetX,
    y: rect.y - insetY,
    width: rect.width + insetX * 2,
    height: rect.height + insetY * 2,
  };

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(field.x + field.width / 2, field.y + field.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-field.width / 2, -field.height / 2);
  drawVoiceGlows(ctx, field.width, field.height, frame, accent, time, c);
  drawVoiceStrokes(ctx, field.width, field.height, frame, accent, silence, time, isMobile, c);
  drawVoiceSparks(ctx, field.width, field.height, frame, accent, time, c);
  ctx.restore();
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
const smoothFrame = ref<AnalysisFrame>({ energy: 0, peak: 0, low: 0, mid: 0, high: 0, zcr: 0 });

let smoothFrameRaw: AnalysisFrame = { energy: 0, peak: 0, low: 0, mid: 0, high: 0, zcr: 0 };

const canvasEl = ref<HTMLCanvasElement | null>(null);
const focusEl = ref<HTMLElement | null>(null);
let canvasCtx: CanvasRenderingContext2D | null = null;
let canvasDpr = 1;
let canvasResizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;

let visualFrameId: number | null = null;
let visualStartedAt = 0;
let visualBaseTimeSeconds = 0;
let frameSkipCounter = 0;
let frameSkipModulo = 2;
let cachedAudioElement: HTMLAudioElement | null | undefined = undefined;

const accentDecayWindowMs = 520;
const accentStrokeThreshold = 0.36;

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
const {
  activeLineIndex,
  activeLine,
  shouldHideActiveLine,
  spokenMemoryLines,
} = usePostImmersiveModeLines({
  post: computed(() => props.post),
  currentTimeMs,
});

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

const resolveCurrentVisualTimeSeconds = (): number => {
  const audioElement = resolveAudioElement();

  if (audioElement && Number.isFinite(audioElement.currentTime)) {
    return audioElement.currentTime;
  }

  const propTime = Number(props.currentTimeSeconds);

  return Number.isFinite(propTime) ? propTime : visualTimeSeconds.value;
};

const resizeCanvas = (): void => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  canvasDpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width  = Math.round(rect.width  * canvasDpr);
  canvas.height = Math.round(rect.height * canvasDpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(canvasDpr, canvasDpr);
  canvasCtx = ctx;
};

const ensureCanvasObserver = (): void => {
  const canvas = canvasEl.value;

  if (!canvas || canvasResizeObserver) {
    return;
  }

  canvasResizeObserver = new ResizeObserver(() => {
    resizeCanvas();
    drawFrame(performance.now());
  });
  canvasResizeObserver.observe(canvas);
};

const getFocusCanvasRect = (canvas: HTMLCanvasElement): CanvasRect => {
  const focus = focusEl.value;

  if (!focus) {
    return {
      x: canvas.width / canvasDpr * 0.12,
      y: canvas.height / canvasDpr * 0.28,
      width: canvas.width / canvasDpr * 0.76,
      height: canvas.height / canvasDpr * 0.44,
    };
  }

  const canvasRect = canvas.getBoundingClientRect();
  const focusRect = focus.getBoundingClientRect();

  return {
    x: focusRect.left - canvasRect.left,
    y: focusRect.top - canvasRect.top,
    width: focusRect.width,
    height: focusRect.height,
  };
};

const drawFrame = (timestamp: number): void => {
  const canvas = canvasEl.value;
  const ctx    = canvasCtx;
  if (!canvas || !ctx) return;
  const w = canvas.width  / canvasDpr;
  const h = canvas.height / canvasDpr;
  const frame  = smoothFrameRaw;
  const accent = nearbyAccentStrength.value;
  const silence = isInsideSilence.value;
  const colors = getColors();
  const linePresence = shouldHideActiveLine.value ? 0 : 1;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, frame, accent, silence, colors);
  drawInk(ctx, w, h, frame, silence, timestamp, colors);
  drawGrain(ctx, w, h, frame, colors);

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    drawFocusVoiceField(ctx, getFocusCanvasRect(canvas), frame, accent, silence, linePresence, timestamp, colors);
  }
};

const smoothAudioFrame = (target: AnalysisFrame): void => {
  const smooth = (current: number, next: number, attack: number, release: number): number => {
    const speed = next > current ? attack : release;
    return current + (next - current) * speed;
  };
  const nextFrame = {
    energy: smooth(smoothFrameRaw.energy, target.energy, 0.13, 0.07),
    low: smooth(smoothFrameRaw.low, target.low, 0.1, 0.055),
    mid: smooth(smoothFrameRaw.mid, target.mid, 0.14, 0.07),
    high: smooth(smoothFrameRaw.high, target.high, 0.11, 0.055),
    zcr: smooth(smoothFrameRaw.zcr, target.zcr, 0.1, 0.05),
    peak: smooth(smoothFrameRaw.peak, target.peak, 0.3, 0.065),
  };

  smoothFrameRaw = nextFrame;
  smoothFrame.value = nextFrame;
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

  ensureCanvasObserver();
  resizeCanvas();

  visualBaseTimeSeconds = resolveCurrentVisualTimeSeconds();
  visualTimeSeconds.value = visualBaseTimeSeconds;
  visualStartedAt = performance.now();
  drawFrame(visualStartedAt);

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
      drawFrame(timestamp);
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
    nextTick(() => {
      Object.assign(smoothFrameRaw, currentAnalysisFrame.value);
      smoothFrame.value = currentAnalysisFrame.value;
      startVisualClock();
      drawFrame(performance.now());
    });
    return;
  }

  stopVisualClock();
  canvasResizeObserver?.disconnect();
  canvasResizeObserver = null;
});

watch(() => props.isPlaying, () => {
  if (!props.isOpen) {
    return;
  }

  const now = performance.now();
  visualBaseTimeSeconds = resolveCurrentVisualTimeSeconds();
  visualTimeSeconds.value = visualBaseTimeSeconds;
  visualStartedAt = now;
  smoothAudioFrame(currentAnalysisFrame.value);
  drawFrame(now);

  if (visualFrameId === null) {
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
    Object.assign(smoothFrameRaw, currentAnalysisFrame.value);
    smoothFrame.value = currentAnalysisFrame.value;
    drawFrame(performance.now());
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  themeObserver = new MutationObserver(() => {
    if (props.isOpen) {
      drawFrame(performance.now());
    }
  });
  themeObserver.observe(document.documentElement, {
    attributeFilter: ['data-theme'],
    attributes: true,
  });

  if (props.isOpen) {
    Object.assign(smoothFrameRaw, currentAnalysisFrame.value);
    smoothFrame.value = currentAnalysisFrame.value;
    nextTick(() => {
      startVisualClock();
      drawFrame(performance.now());
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  stopVisualClock();
  canvasResizeObserver?.disconnect();
  canvasResizeObserver = null;
  themeObserver?.disconnect();
  themeObserver = null;
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
        <canvas ref="canvasEl" class="post-immersive-mode__canvas" aria-hidden="true" />

        <header class="post-immersive-mode__topbar">
          <div class="post-immersive-mode__meta">
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

          <section ref="focusEl" class="post-immersive-mode__focus">
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
