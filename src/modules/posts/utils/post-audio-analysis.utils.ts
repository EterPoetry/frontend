import type { AnalysisFrame } from '@/modules/posts/interfaces/analysis-frame.interface';
import type { DecodedPostAudioAnalysis } from '@/modules/posts/interfaces/decoded-post-audio-analysis.interface';
import type { PostAudioAnalysis } from '@/modules/posts/interfaces/post-audio-analysis.interface';

const decodeBase64ToBytes = (value: string): Uint8Array => {
    try {
        const binary = window.atob(value);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
    } catch {
        return new Uint8Array();
    }
};

const lerp = (from: number, to: number, mix: number): number => (
    from + (to - from) * mix
);

export const decodePostAudioAnalysis = (
    analysis: PostAudioAnalysis | null | undefined,
): DecodedPostAudioAnalysis | null => {
    if (!analysis?.frames || !analysis.features.length || !analysis.frameMs) {
        return null;
    }

    const bytes = decodeBase64ToBytes(analysis.frames);
    const frameSize = analysis.features.length;
    const frameCount = Math.floor(bytes.length / frameSize);

    if (!bytes.length || !frameCount) {
        return null;
    }

    const featureIndex = {
        energy: analysis.features.indexOf('energy'),
        peak: analysis.features.indexOf('peak'),
        low: analysis.features.indexOf('low'),
        mid: analysis.features.indexOf('mid'),
        high: analysis.features.indexOf('high'),
        zcr: analysis.features.indexOf('zcr'),
    };

    const result: DecodedPostAudioAnalysis = {
        frameMs: analysis.frameMs,
        frameCount,
        energy: new Float32Array(frameCount),
        peak: new Float32Array(frameCount),
        low: new Float32Array(frameCount),
        mid: new Float32Array(frameCount),
        high: new Float32Array(frameCount),
        zcr: new Float32Array(frameCount),
    };

    const readFeature = (frameIndex: number, index: number): number => {
        if (index < 0) {
            return 0;
        }

        return (bytes[frameIndex * frameSize + index] ?? 0) / 255;
    };

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        result.energy[frameIndex] = readFeature(frameIndex, featureIndex.energy);
        result.peak[frameIndex] = readFeature(frameIndex, featureIndex.peak);
        result.low[frameIndex] = readFeature(frameIndex, featureIndex.low);
        result.mid[frameIndex] = readFeature(frameIndex, featureIndex.mid);
        result.high[frameIndex] = readFeature(frameIndex, featureIndex.high);
        result.zcr[frameIndex] = readFeature(frameIndex, featureIndex.zcr);
    }

    return result;
};

export const readInterpolatedAnalysisFrame = (
    analysis: DecodedPostAudioAnalysis,
    framePosition: number,
): AnalysisFrame => {
    const safePosition = Math.min(
        analysis.frameCount - 1,
        Math.max(0, framePosition),
    );

    const previousIndex = Math.floor(safePosition);
    const nextIndex = Math.min(analysis.frameCount - 1, previousIndex + 1);
    const mix = safePosition - previousIndex;

    return {
        energy: lerp(analysis.energy[previousIndex] ?? 0, analysis.energy[nextIndex] ?? 0, mix),
        peak: lerp(analysis.peak[previousIndex] ?? 0, analysis.peak[nextIndex] ?? 0, mix),
        low: lerp(analysis.low[previousIndex] ?? 0, analysis.low[nextIndex] ?? 0, mix),
        mid: lerp(analysis.mid[previousIndex] ?? 0, analysis.mid[nextIndex] ?? 0, mix),
        high: lerp(analysis.high[previousIndex] ?? 0, analysis.high[nextIndex] ?? 0, mix),
        zcr: lerp(analysis.zcr[previousIndex] ?? 0, analysis.zcr[nextIndex] ?? 0, mix),
    };
};

export const getFallbackAnalysisFrame = (timeSeconds: number, isPlaying: boolean): AnalysisFrame => {
    const playingFactor = isPlaying ? 1 : 0.36;
    const base = (0.22 + Math.sin(timeSeconds * 2.1) * 0.08 + Math.sin(timeSeconds * 4.7) * 0.04) * playingFactor;

    return {
        energy: Math.max(0.04, base),
        peak: Math.max(0.04, base * 0.9),
        low: Math.max(0.04, base * 0.82),
        mid: Math.max(0.04, base),
        high: Math.max(0.04, base * 0.62),
        zcr: Math.max(0.04, base * 0.5),
    };
};
