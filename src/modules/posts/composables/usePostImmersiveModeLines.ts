import { computed, type ComputedRef, type Ref } from 'vue';
import type { Post } from '@/modules/posts/interfaces/post.interface';

export type SpokenMemoryLine = {
    key: string;
    text: string;
    style: Record<string, string>;
};

type UsePostImmersiveModeLinesOptions = {
    post: Readonly<Ref<Post>>;
    currentTimeMs: Readonly<ComputedRef<number>>;
};

type UsePostImmersiveModeLinesReturn = {
    activeLineIndex: ComputedRef<number>;
    activeLine: ComputedRef<string>;
    shouldHideActiveLine: ComputedRef<boolean>;
    spokenMemoryLines: ComputedRef<SpokenMemoryLine[]>;
};

const MAX_MEMORY_LINES = 11;
const LEADING_SILENCE_TOLERANCE_MS = 120;
const TRAILING_SILENCE_TOLERANCE_MS = 160;
const ANTICIPATION_MS = 380;

const getStableMemoryNumber = (seed: number, salt: number): number => {
    const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;

    return value - Math.floor(value);
};

const getStableMemoryRange = (seed: number, salt: number, min: number, max: number): number => (
    min + getStableMemoryNumber(seed, salt) * (max - min)
);

const isSpokenMemoryLine = (line: SpokenMemoryLine | null): line is SpokenMemoryLine => line !== null;

export const usePostImmersiveModeLines = ({
    post,
    currentTimeMs,
}: UsePostImmersiveModeLinesOptions): UsePostImmersiveModeLinesReturn => {
    const textLines = computed(() => (post.value.text ?? '').split('\n'));

    const synchronizationLines = computed(() => post.value.textSynchronization ?? []);

    const lastSynchronizedLineIndex = computed(() => {
        const synchronization = synchronizationLines.value;

        if (!synchronization.length) {
            return 0;
        }

        return synchronization[synchronization.length - 1]?.lineIndex ?? 0;
    });

    const leadingSilenceEndMs = computed(() => {
        const silences = post.value.audioAnalysis?.silences ?? [];

        const leadingSilence = silences.find(([startMs, endMs]) => (
            startMs <= LEADING_SILENCE_TOLERANCE_MS && endMs > LEADING_SILENCE_TOLERANCE_MS
        ));

        return leadingSilence?.[1] ?? 0;
    });

    const trailingSilenceStartMs = computed(() => {
        const analysis = post.value.audioAnalysis;
        const silences = analysis?.silences ?? [];
        const durationMs = analysis?.durationMs ?? Math.round((post.value.audioDurationSeconds ?? 0) * 1000);

        if (!durationMs) {
            return null;
        }

        const trailingSilence = [...silences].reverse().find(([startMs, endMs]) => (
            endMs >= durationMs - TRAILING_SILENCE_TOLERANCE_MS
                && startMs < durationMs - TRAILING_SILENCE_TOLERANCE_MS
        ));

        return trailingSilence?.[0] ?? null;
    });

    const activeLineIndex = computed(() => {
        const synchronization = synchronizationLines.value;

        if (!synchronization.length) {
            return 0;
        }

        const displayTimeMs = currentTimeMs.value + ANTICIPATION_MS;
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

    const spokenMemoryLines = computed<SpokenMemoryLine[]>(() => {
        const activeIndex = activeLineIndex.value;
        const spoken = synchronizationLines.value
            .filter((item) => (
                item.lineIndex < activeIndex
                || (isAfterLastSpokenLine.value && item.lineIndex === activeIndex)
            ))
            .slice(-MAX_MEMORY_LINES);

        const memoryLines: Array<SpokenMemoryLine | null> = spoken.map((item, itemIndex, items) => {
            const text = textLines.value[item.lineIndex] ?? '';

            if (!text.trim()) {
                return null;
            }

            const age = items.length - itemIndex;
            const ageProgress = Math.min(1, Math.max(0, (age - 1) / Math.max(1, MAX_MEMORY_LINES - 1)));
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
    });

    return {
        activeLineIndex,
        activeLine,
        shouldHideActiveLine,
        spokenMemoryLines,
    };
};
