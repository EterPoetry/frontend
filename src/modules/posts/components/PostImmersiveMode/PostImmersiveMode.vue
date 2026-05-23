<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import PostAudioWaveform from '@/modules/posts/components/PostAudioWaveform/PostAudioWaveform.vue';
import PlayerVolumeControl from '@/modules/posts/components/PlayerVolumeControl/PlayerVolumeControl.vue';
import {usePostImmersiveModeLines} from '@/modules/posts/composables/usePostImmersiveModeLines';
import type {AnalysisFrame} from '@/modules/posts/interfaces/analysis-frame.interface';
import type {DecodedPostAudioAnalysis} from '@/modules/posts/interfaces/decoded-post-audio-analysis.interface';
import type {Post} from '@/modules/posts/interfaces/post.interface';
import {
  decodePostAudioAnalysis,
  getFallbackAnalysisFrame,
  readInterpolatedAnalysisFrame,
} from '@/modules/posts/utils/post-audio-analysis.utils';
import {formatPostDuration} from '@/modules/posts/utils/post-formatting.utils';
import {uk} from '@/shared/locales/uk';
import './PostImmersiveMode.css';

type GlowPreset = { x: number; y: number; baseSize: number; tone: 'low' | 'mid' | 'high'; seed: number };
const GLOW_PRESETS: GlowPreset[] = [
  {x: 0.28, y: 0.36, baseSize: 34, tone: 'low', seed: 1},
  {x: 0.64, y: 0.38, baseSize: 42, tone: 'mid', seed: 2},
  {x: 0.42, y: 0.58, baseSize: 52, tone: 'high', seed: 3},
  {x: 0.72, y: 0.61, baseSize: 30, tone: 'low', seed: 4},
  {x: 0.52, y: 0.43, baseSize: 46, tone: 'mid', seed: 5},
  {x: 0.35, y: 0.67, baseSize: 26, tone: 'high', seed: 6},
  {x: 0.78, y: 0.47, baseSize: 24, tone: 'mid', seed: 7},
];

type StrokePreset = {
  x: number; y: number; rotate: number;
  lowW: number; midW: number; highW: number; peakW: number;
  isAccentCandidate: boolean; isWhisperCandidate: boolean;
  driftX: number; driftY: number; driftDelay: number;
};

const buildStrokePresets = (): StrokePreset[] =>
    Array.from({length: 36}, (_, i) => {
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
        lowW: cluster === 0 || cluster === 3 ? 0.58 : 0.22,
        midW: cluster === 1 || cluster === 4 ? 0.62 : 0.30,
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
  clear: string;
};
const DARK_COLORS: CanvasColors = {
  toneLow: [176, 91, 67], toneMid: [199, 126, 82], toneHigh: [236, 202, 154],
  bgBase: '#0b090b', bgMid: '#21161d', bgEnd: '#070607',
  accent1: [230, 179, 118], accent1A: 0.12,
  accent2: [174, 89, 67], accent2A: 0.16,
  grain: [255, 247, 236], grainMode: 'soft-light',
  clear: 'rgba(0,0,0,0)',
};
const LIGHT_COLORS: CanvasColors = {
  toneLow: [171, 99, 68],
  toneMid: [184, 107, 63],
  toneHigh: [214, 158, 97],
  bgBase: '#fff9f1', bgMid: '#efe0cc', bgEnd: '#fff7ef',
  accent1: [190, 112, 64], accent1A: 0.11,
  accent2: [224, 185, 132], accent2A: 0.28,
  grain: [122, 98, 84], grainMode: 'soft-light',
  clear: 'rgba(255,255,255,0)',
};

const rgbaOf = (c: RGB, a: number): string =>
    `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

const accentDecayWindowMs = 520;
const accentStrokeThreshold = 0.36;

const drawBackground = (
    ctx: CanvasRenderingContext2D, w: number, h: number,
    frame: AnalysisFrame, accent: number, silence: boolean, c: CanvasColors,
    spotCanvas: HTMLCanvasElement,
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
  r1.addColorStop(1, c.clear);
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, w, h);

  const r2 = ctx.createRadialGradient(w * 0.14, h * 0.84, 0, w * 0.14, h * 0.84, w * 0.32);
  r2.addColorStop(0, rgbaOf(c.accent2, c.accent2A));
  r2.addColorStop(1, c.clear);
  ctx.fillStyle = r2;
  ctx.fillRect(0, 0, w, h);

  const paperA = Math.max(0, 0.64 + energy * 0.22 - (silence ? 0.16 : 0));
  const pr = Math.max(w, h) * (0.5 + energy * 0.007);
  const paper = ctx.createRadialGradient(w * 0.5, h * 0.46 + yOffset, 0, w * 0.5, h * 0.46 + yOffset, pr);
  paper.addColorStop(0, rgbaOf(c.toneHigh, tnHigh * 0.18 * paperA));
  paper.addColorStop(0.36, rgbaOf(c.toneMid, tnMid * 0.19 * paperA));
  paper.addColorStop(0.58, rgbaOf(c.toneLow, tnLow * 0.16 * paperA));
  paper.addColorStop(0.78, c.clear);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);

  // Spot: render to small offscreen canvas, then scale up. The implicit smoothing
  // when scaling a low-res canvas up gives a free blur effect, replacing the
  // ctx.filter='blur(24px)' call which was extremely expensive every frame.
  const spotA = Math.max(0, 0.42 + mid * 0.36 + accent * 0.22 - (silence ? 0.14 : 0));
  if (spotA > 0.005) {
    const blendR = c.toneLow[0] * tnLow * 0.22 + c.toneMid[0] * tnMid * 0.30 + c.toneHigh[0] * tnHigh * 0.26;
    const blendG = c.toneLow[1] * tnLow * 0.22 + c.toneMid[1] * tnMid * 0.30 + c.toneHigh[1] * tnHigh * 0.26;
    const blendB = c.toneLow[2] * tnLow * 0.22 + c.toneMid[2] * tnMid * 0.30 + c.toneHigh[2] * tnHigh * 0.26;
    const sctx = spotCanvas.getContext('2d');
    if (sctx) {
      const sw = spotCanvas.width;
      const sh = spotCanvas.height;
      sctx.clearRect(0, 0, sw, sh);
      const cx = sw * 0.5;
      const cy = sh * (0.44 + (yOffset / h));
      const sr = Math.max(sw, sh) * 0.42;
      const spot = sctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
      spot.addColorStop(0, `rgba(${Math.round(blendR)},${Math.round(blendG)},${Math.round(blendB)},${spotA.toFixed(3)})`);
      spot.addColorStop(1, c.clear);
      sctx.fillStyle = spot;
      sctx.fillRect(0, 0, sw, sh);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(spotCanvas, 0, 0, w, h);
      ctx.restore();
    }
  }
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
  if (a1 > 0.005) {
    const dx1 = Math.sin(t1 * Math.PI * 2) * w * 0.07;
    const dy1 = Math.sin(t1 * Math.PI * 2 + 1) * h * -0.04;
    const cx1 = -inkSize * 0.28 + dx1;
    const cy1 = -inkSize * 0.36 + dy1;
    const gr1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, inkSize * 0.5 * scale);
    gr1.addColorStop(0, rgbaOf(c.toneLow, 0.2 * a1));
    gr1.addColorStop(0.68, c.clear);
    ctx.fillStyle = gr1;
    ctx.fillRect(0, 0, w, h);
  }

  const t2 = ((time + 9000) % period) / period;
  const a2 = Math.max(0, 0.18 + frame.high * 0.18 - (silence ? 0.08 : 0));
  if (a2 > 0.005) {
    const dx2 = Math.sin(t2 * Math.PI * 2) * w * 0.07;
    const dy2 = Math.sin(t2 * Math.PI * 2 + 1) * h * -0.04;
    const cx2 = w + inkSize * 0.32 + dx2;
    const cy2 = h + inkSize * 0.36 + dy2;
    const gr2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, inkSize * 0.5 * scale);
    gr2.addColorStop(0, `rgba(232,190,132,${(0.16 * a2).toFixed(3)})`);
    gr2.addColorStop(0.68, c.clear);
    ctx.fillStyle = gr2;
    ctx.fillRect(0, 0, w, h);
  }
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
    const color = p.tone === 'low' ? c.toneLow : p.tone === 'mid' ? c.toneMid : c.toneHigh;

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
    gr.addColorStop(0, rgbaOf(color, opacity));
    gr.addColorStop(0.6, rgbaOf(color, opacity * 0.35));
    gr.addColorStop(1, c.clear);
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
  const mobileScale = isMobile ? 0.72 : 1;
  const accentActive = accent > accentStrokeThreshold;

  for (let i = 0; i < count; i++) {
    const p = STROKE_PRESETS[i];
    const rawLevel = (
        frame.energy * 0.22 * sf +
        frame.low * p.lowW * sf +
        frame.mid * p.midW * sf +
        frame.high * p.highW * sf +
        frame.peak * p.peakW * sf
    ) / 1.9;
    const level = Math.min(1, Math.max(0.035, Math.pow(rawLevel, 0.72)));
    const isAccent = accentActive && p.isAccentCandidate;
    const isWhisper = frame.high > frame.low && p.isWhisperCandidate;

    const halfLen = ((22 + level * 72 + accent * (isAccent ? 32 : 10)) * mobileScale) / 2;
    const halfH = ((1.4 + level * 2.8 + (isAccent ? accent * 1.5 : 0)) * (isWhisper ? 0.72 : 1)) / 2;
    const opacity = Math.min(0.82, 0.12 + level * 0.52 + accent * (isAccent ? 0.22 : 0.08)) * (isWhisper ? 0.82 : 1);
    if (opacity < 0.02) continue;
    const scaleX = 0.72 + level * 0.54;

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
    // ctx.filter='blur(0.2px)' was a perf killer for sub-pixel blur — removed.
    // The whisper softening is already conveyed by reduced opacity and halfH.

    const gr = ctx.createLinearGradient(-halfLen, 0, halfLen, 0);
    gr.addColorStop(0, c.clear);
    if (isAccent) {
      gr.addColorStop(0.3, rgbaOf(c.toneHigh, opacity));
      gr.addColorStop(0.7, rgbaOf(c.toneMid, opacity));
    } else {
      gr.addColorStop(0.3, rgbaOf(c.toneMid, opacity));
      gr.addColorStop(0.7, rgbaOf(c.toneLow, opacity * 0.6));
    }
    gr.addColorStop(1, c.clear);

    ctx.fillStyle = gr;

    // Shadow only on accent strokes (rare, high-impact). Applying it to all
    // 18-36 strokes every frame was a major perf hit.
    if (isAccent) {
      ctx.shadowBlur = Math.min(16, 8 + accent * 12);
      ctx.shadowColor = rgbaOf(c.toneHigh, 0.36);
    }

    fillCapsule(ctx, 0, 0, halfLen, halfH);
    ctx.fill();

    ctx.restore();
  }
};

const drawVoiceSparks = (
    ctx: CanvasRenderingContext2D, w: number, h: number,
    frame: AnalysisFrame, accent: number, time: number, c: CanvasColors,
): void => {
  // Early-out: sparks only show during accents/peaks. Skip the whole loop
  // when neither is active (most frames during normal speech).
  const baseOpacity = accent * 0.72 + frame.peak * 0.18 - 0.16;
  if (baseOpacity <= 0.005) return;

  const opacity = baseOpacity;
  for (let i = 0; i < 10; i++) {
    const s = i + 1;
    const x = 0.5 + Math.sin(s * 2.37) * (0.18 + frame.zcr * 0.12);
    const y = 0.5 + Math.cos(s * 1.81) * (0.16 + frame.high * 0.14);
    const r = ((3 + frame.high * 8 + accent * 6) / 2) * (0.4 + accent * 1.6 + frame.peak * 0.7);
    const phase = ((time + s * -110) % 680) / 680;
    const bloom = 1 + Math.sin(phase * Math.PI * 2) * 0.15;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = rgbaOf(c.toneMid, opacity * 0.3);
    ctx.fillStyle = rgbaOf(c.toneHigh, opacity);
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x * w, y * h, Math.max(0.5, r * bloom), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Grain is deterministic — pre-render to an offscreen canvas once per
// theme/size, then draw the cached image with varying alpha each frame.
// Previously: ~250k fillRect calls per frame at 2000x2000. Now: 1 drawImage.
type GrainCache = {
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  grainKey: string;
};
const grainCache: GrainCache = {canvas: null, width: 0, height: 0, grainKey: ''};

const buildGrainCanvas = (w: number, h: number, c: CanvasColors): HTMLCanvasElement => {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(w));
  off.height = Math.max(1, Math.round(h));
  const octx = off.getContext('2d');
  if (!octx) return off;
  octx.fillStyle = rgbaOf(c.grain, 0.5);
  for (let x = 0; x < w; x += 4) {
    for (let y = 0; y < h; y += 4) {
      if (((x * 13 + y * 7) % 17) < 5) {
        octx.fillRect(x, y, 1, 1);
      }
    }
  }
  for (let x = 0; x < w; x += 132) {
    octx.fillRect(x, 0, 1, h);
  }
  return off;
};

const drawGrain = (
    ctx: CanvasRenderingContext2D, w: number, h: number, frame: AnalysisFrame, c: CanvasColors,
): void => {
  const opacity = 0.065 + frame.high * 0.055;
  const grainKey = `${c.grain[0]}-${c.grain[1]}-${c.grain[2]}-${c.grainMode}`;

  if (
      !grainCache.canvas ||
      grainCache.width !== w ||
      grainCache.height !== h ||
      grainCache.grainKey !== grainKey
  ) {
    grainCache.canvas = buildGrainCanvas(w, h, c);
    grainCache.width = w;
    grainCache.height = h;
    grainCache.grainKey = grainKey;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = c.grainMode;
  ctx.drawImage(grainCache.canvas!, 0, 0);
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
    isMobile: boolean,
    c: CanvasColors,
): void => {
  const silenceFactor = silence ? 0.54 : 1;
  const energy = frame.energy * silenceFactor;
  const opacity = Math.max(0, (0.72 + energy * 0.14 - (silence ? 0.16 : 0)) * (0.52 + linePresence * 0.48));
  if (opacity <= 0.01) return;
  const scale = 0.99 + energy * 0.01 + accent * 0.014;
  const insetX = rect.width * (isMobile ? 0.1 : 0.05);
  const insetY = rect.height * 0.1;
  const fieldW = rect.width + insetX * 2;
  const fieldH = rect.height + insetY * 2;
  const fieldX = rect.x - insetX;
  const fieldY = rect.y - insetY;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(fieldX + fieldW / 2, fieldY + fieldH / 2);
  ctx.scale(scale, scale);
  ctx.translate(-fieldW / 2, -fieldH / 2);
  drawVoiceGlows(ctx, fieldW, fieldH, frame, accent, time, c);
  drawVoiceStrokes(ctx, fieldW, fieldH, frame, accent, silence, time, isMobile, c);
  drawVoiceSparks(ctx, fieldW, fieldH, frame, accent, time, c);
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
const smoothFrame = ref<AnalysisFrame>({energy: 0, peak: 0, low: 0, mid: 0, high: 0, zcr: 0});
const silenceRef = ref(false);
const accentRef = ref(0);

// Non-reactive scratch state — update every frame and don't need to trigger
// Vue's reactivity. Plain variables avoid proxy/dep-tracking overhead in
// the hot path.
let smoothFrameRaw: AnalysisFrame = {energy: 0, peak: 0, low: 0, mid: 0, high: 0, zcr: 0};
let visualTimeSecondsRaw = 0;
let currentAccent = 0;
let currentSilence = false;
let currentAnalysisFrameRaw: AnalysisFrame = {energy: 0, peak: 0, low: 0, mid: 0, high: 0, zcr: 0};

const canvasEl = ref<HTMLCanvasElement | null>(null);
const focusEl = ref<HTMLElement | null>(null);
let canvasCtx: CanvasRenderingContext2D | null = null;
let canvasDpr = 1;
let canvasResizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;
let spotCanvas: HTMLCanvasElement | null = null;

let visualFrameId: number | null = null;
let visualStartedAt = 0;
let visualBaseTimeSeconds = 0;
let frameSkipCounter = 0;
let frameSkipModulo = 2;
let cachedAudioElement: HTMLAudioElement | null | undefined = undefined;

// Cached per-frame inputs (refreshed only when they actually change)
let cachedColors: CanvasColors = DARK_COLORS;
let cachedIsMobile = false;
let cachedReducedMotion = false;
let cachedFocusRect: CanvasRect = {x: 0, y: 0, width: 0, height: 0};
let focusRectDirty = true;
let publishStateCounter = 0;

const safeProgressPercent = computed(() => {
  const value = Number(props.progressPercent);
  return Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : 0;
});

const decodedAnalysis = computed<DecodedPostAudioAnalysis | null>(() => decodePostAudioAnalysis(props.post.audioAnalysis));

// currentTimeMs stays reactive for the lines composable, but visualTimeSeconds
// only updates at ~10Hz (every ~100ms) — enough for line switching and the
// time display, infrequent enough to avoid reactivity overhead per frame.
const currentTimeMs = computed(() => {
  const value = Number(visualTimeSeconds.value);
  return Number.isFinite(value)
      ? Math.max(0, Math.floor(value * 1000))
      : 0;
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

// Non-reactive helpers — called inside the rAF loop with plain numbers.
const computeAnalysisFrameAt = (timeMsValue: number, timeSeconds: number): AnalysisFrame => {
  const analysis = decodedAnalysis.value;
  if (!analysis) {
    return getFallbackAnalysisFrame(timeSeconds, props.isPlaying);
  }
  const frameMs = analysis.frameMs || 1;
  return readInterpolatedAnalysisFrame(analysis, timeMsValue / frameMs);
};

const computeAccentAt = (timeMsValue: number): number => {
  const analysis = props.post.audioAnalysis;
  if (!analysis?.accents?.length) return 0;
  let strength = 0;
  const accents = analysis.accents;
  for (let i = 0; i < accents.length; i++) {
    const accentTimeMs = accents[i][0];
    const accentStrength = accents[i][1];
    const distance = Math.abs(accentTimeMs - timeMsValue);
    if (distance > accentDecayWindowMs) continue;
    const v = accentStrength * (1 - distance / accentDecayWindowMs);
    if (v > strength) strength = v;
  }
  return strength < 0 ? 0 : strength > 1 ? 1 : strength;
};

const computeSilenceAt = (timeMsValue: number): boolean => {
  const analysis = props.post.audioAnalysis;
  if (!analysis?.silences?.length) return false;
  const silences = analysis.silences;
  for (let i = 0; i < silences.length; i++) {
    if (timeMsValue >= silences[i][0] && timeMsValue <= silences[i][1]) return true;
  }
  return false;
};

// Style uses throttled reactive refs so DOM updates only fire at ~10Hz.
const sceneAudioStyle = computed(() => {
  const frame = smoothFrame.value;
  const silence = silenceRef.value;
  const silenceFactor = silence ? 0.54 : 1;
  const accent = accentRef.value;

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
    '--silence': silence ? '1' : '0',
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
  return Number.isFinite(propTime) ? propTime : visualTimeSecondsRaw;
};

const refreshCachedColors = (): void => {
  cachedColors = document.documentElement.getAttribute('data-theme') === 'light'
      ? LIGHT_COLORS
      : DARK_COLORS;
  // Force grain regeneration on theme change
  grainCache.grainKey = '';
};

const refreshCachedEnv = (): void => {
  cachedIsMobile = window.innerWidth < 760;
  cachedReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const resizeCanvas = (): void => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  canvasDpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = Math.round(rect.width * canvasDpr);
  canvas.height = Math.round(rect.height * canvasDpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(canvasDpr, canvasDpr);
  canvasCtx = ctx;

  // Recreate the spot offscreen canvas at low res — implicit upscale blur
  if (!spotCanvas) spotCanvas = document.createElement('canvas');
  spotCanvas.width = Math.max(32, Math.round(rect.width / 6));
  spotCanvas.height = Math.max(32, Math.round(rect.height / 6));

  focusRectDirty = true;
  refreshCachedEnv();
};

const ensureCanvasObserver = (): void => {
  const canvas = canvasEl.value;
  if (!canvas || canvasResizeObserver) return;

  canvasResizeObserver = new ResizeObserver(() => {
    resizeCanvas();
    drawFrame(performance.now());
  });
  canvasResizeObserver.observe(canvas);
};

const updateFocusRect = (canvas: HTMLCanvasElement): void => {
  const focus = focusEl.value;
  if (!focus) {
    cachedFocusRect = {
      x: canvas.width / canvasDpr * 0.12,
      y: canvas.height / canvasDpr * 0.28,
      width: canvas.width / canvasDpr * 0.76,
      height: canvas.height / canvasDpr * 0.44,
    };
    return;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const focusRect = focus.getBoundingClientRect();
  cachedFocusRect = {
    x: focusRect.left - canvasRect.left,
    y: focusRect.top - canvasRect.top,
    width: focusRect.width,
    height: focusRect.height,
  };
};

const drawFrame = (timestamp: number): void => {
  const canvas = canvasEl.value;
  const ctx = canvasCtx;
  if (!canvas || !ctx || !spotCanvas) return;
  const w = canvas.width / canvasDpr;
  const h = canvas.height / canvasDpr;
  const frame = smoothFrameRaw;
  const accent = currentAccent;
  const silence = currentSilence;
  const colors = cachedColors;
  const linePresence = shouldHideActiveLine.value ? 0 : 1;

  if (focusRectDirty) {
    updateFocusRect(canvas);
    focusRectDirty = false;
  }

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, frame, accent, silence, colors, spotCanvas);
  drawInk(ctx, w, h, frame, silence, timestamp, colors);
  drawGrain(ctx, w, h, frame, colors);

  if (!cachedReducedMotion) {
    drawFocusVoiceField(ctx, cachedFocusRect, frame, accent, silence, linePresence, timestamp, cachedIsMobile, colors);
  }
};

const smoothAudioFrame = (target: AnalysisFrame): void => {
  // Inlined smoothing — avoids inner-function call overhead on the hot path.
  const sE = target.energy > smoothFrameRaw.energy ? 0.13 : 0.07;
  const sL = target.low > smoothFrameRaw.low ? 0.10 : 0.055;
  const sM = target.mid > smoothFrameRaw.mid ? 0.14 : 0.07;
  const sH = target.high > smoothFrameRaw.high ? 0.11 : 0.055;
  const sZ = target.zcr > smoothFrameRaw.zcr ? 0.10 : 0.05;
  const sP = target.peak > smoothFrameRaw.peak ? 0.30 : 0.065;

  smoothFrameRaw = {
    energy: smoothFrameRaw.energy + (target.energy - smoothFrameRaw.energy) * sE,
    low: smoothFrameRaw.low + (target.low - smoothFrameRaw.low) * sL,
    mid: smoothFrameRaw.mid + (target.mid - smoothFrameRaw.mid) * sM,
    high: smoothFrameRaw.high + (target.high - smoothFrameRaw.high) * sH,
    zcr: smoothFrameRaw.zcr + (target.zcr - smoothFrameRaw.zcr) * sZ,
    peak: smoothFrameRaw.peak + (target.peak - smoothFrameRaw.peak) * sP,
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
  refreshCachedEnv();
  refreshCachedColors();
  frameSkipModulo = cachedIsMobile ? 3 : 2;

  ensureCanvasObserver();
  resizeCanvas();

  visualBaseTimeSeconds = resolveCurrentVisualTimeSeconds();
  visualTimeSecondsRaw = visualBaseTimeSeconds;
  visualTimeSeconds.value = visualBaseTimeSeconds;
  visualStartedAt = performance.now();
  publishStateCounter = 0;

  // Seed raw analysis state
  currentAnalysisFrameRaw = computeAnalysisFrameAt(visualBaseTimeSeconds * 1000, visualBaseTimeSeconds);
  currentAccent = computeAccentAt(visualBaseTimeSeconds * 1000);
  currentSilence = computeSilenceAt(visualBaseTimeSeconds * 1000);
  accentRef.value = currentAccent;
  silenceRef.value = currentSilence;

  drawFrame(visualStartedAt);

  const tick = (timestamp: number): void => {
    if (!props.isOpen) {
      visualFrameId = null;
      return;
    }

    const audioElement = resolveAudioElement();
    if (audioElement && Number.isFinite(audioElement.currentTime)) {
      visualTimeSecondsRaw = audioElement.currentTime;
    } else if (props.isPlaying) {
      visualTimeSecondsRaw = visualBaseTimeSeconds + (timestamp - visualStartedAt) / 1000;
    } else {
      const propTime = Number(props.currentTimeSeconds);
      if (Number.isFinite(propTime)) {
        visualTimeSecondsRaw = propTime;
      }
    }

    frameSkipCounter = (frameSkipCounter + 1) % frameSkipModulo;

    if (frameSkipCounter === 0) {
      const tMs = visualTimeSecondsRaw * 1000;
      currentAnalysisFrameRaw = computeAnalysisFrameAt(tMs, visualTimeSecondsRaw);
      currentAccent = computeAccentAt(tMs);
      currentSilence = computeSilenceAt(tMs);
      smoothAudioFrame(currentAnalysisFrameRaw);
      drawFrame(timestamp);

      // Publish state to Vue refs at ~10Hz (every 6 draw frames ≈ 200ms at 30fps).
      // This drives line switching, time display, and CSS vars without firing
      // reactivity on every animation frame.
      publishStateCounter++;
      if (publishStateCounter >= 3) {
        publishStateCounter = 0;
        visualTimeSeconds.value = visualTimeSecondsRaw;
        smoothFrame.value = smoothFrameRaw;
        if (accentRef.value !== currentAccent) accentRef.value = currentAccent;
        if (silenceRef.value !== currentSilence) silenceRef.value = currentSilence;
      }
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

const handleWindowResize = (): void => {
  refreshCachedEnv();
  frameSkipModulo = cachedIsMobile ? 3 : 2;
  focusRectDirty = true;
};

watch(() => safeProgressPercent.value, (progressPercent) => {
  if (!isSeeking.value) {
    seekInput.value = String(progressPercent);
  }
}, {immediate: true});

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    seekInput.value = String(safeProgressPercent.value);
    isSeeking.value = false;
    nextTick(() => {
      refreshCachedColors();
      const initialFrame = computeAnalysisFrameAt(visualTimeSecondsRaw * 1000, visualTimeSecondsRaw);
      Object.assign(smoothFrameRaw, initialFrame);
      smoothFrame.value = {...initialFrame};
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
  visualTimeSecondsRaw = visualBaseTimeSeconds;
  visualTimeSeconds.value = visualBaseTimeSeconds;
  visualStartedAt = now;
  const f = computeAnalysisFrameAt(visualBaseTimeSeconds * 1000, visualBaseTimeSeconds);
  smoothAudioFrame(f);
  smoothFrame.value = {...smoothFrameRaw};
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
    visualTimeSecondsRaw = value;
    visualTimeSeconds.value = value;
    const f = computeAnalysisFrameAt(value * 1000, value);
    Object.assign(smoothFrameRaw, f);
    smoothFrame.value = {...f};
    currentAccent = computeAccentAt(value * 1000);
    currentSilence = computeSilenceAt(value * 1000);
    accentRef.value = currentAccent;
    silenceRef.value = currentSilence;
    drawFrame(performance.now());
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleWindowResize, {passive: true});
  themeObserver = new MutationObserver(() => {
    refreshCachedColors();
    if (props.isOpen) {
      drawFrame(performance.now());
    }
  });
  themeObserver.observe(document.documentElement, {
    attributeFilter: ['data-theme'],
    attributes: true,
  });

  refreshCachedColors();
  refreshCachedEnv();

  if (props.isOpen) {
    const initialFrame = computeAnalysisFrameAt(visualTimeSecondsRaw * 1000, visualTimeSecondsRaw);
    Object.assign(smoothFrameRaw, initialFrame);
    smoothFrame.value = {...initialFrame};
    nextTick(() => {
      startVisualClock();
      drawFrame(performance.now());
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleWindowResize);
  stopVisualClock();
  canvasResizeObserver?.disconnect();
  canvasResizeObserver = null;
  themeObserver?.disconnect();
  themeObserver = null;
  cachedAudioElement = undefined;
  spotCanvas = null;
  grainCache.canvas = null;
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
            'post-immersive-mode--silence': silenceRef,
            'post-immersive-mode--line-hidden': shouldHideActiveLine,
          }"
          :style="sceneAudioStyle"
          role="dialog"
          aria-modal="true"
          :aria-label="uk.posts.details.immersiveTitle"
      >
        <canvas ref="canvasEl" class="post-immersive-mode__canvas" aria-hidden="true"/>

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
            <img :src="closeIconUrl" alt=""/>
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
            <img v-if="isPlaying" :src="pauseLightIconUrl" alt="" class="audio-play-button__pause-icon"/>
            <img v-else :src="playIconUrl" :alt="uk.posts.audio.play" class="audio-play-button__play-icon"/>
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