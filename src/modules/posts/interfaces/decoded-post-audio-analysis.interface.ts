export interface DecodedPostAudioAnalysis {
    frameMs: number;
    frameCount: number;
    energy: Float32Array;
    peak: Float32Array;
    low: Float32Array;
    mid: Float32Array;
    high: Float32Array;
    zcr: Float32Array;
}
