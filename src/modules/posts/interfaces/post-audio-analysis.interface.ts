export interface PostAudioAnalysis {
    version: 1;
    durationMs: number;
    frameMs: number;
    features: Array<'energy' | 'peak' | 'low' | 'mid' | 'high' | 'zcr'>;
    frames: string;
    waveform: string;
    accents: Array<[number, number]>;
    silences: Array<[number, number]>;
}