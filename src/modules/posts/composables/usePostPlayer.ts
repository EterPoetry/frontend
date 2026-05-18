import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { usePostsStore } from '@/modules/posts/posts.store';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { StoredPostPlayerState } from '@/modules/posts/interfaces/stored-post-player-state.interface';
import { applyRememberedPostLikeState } from '@/modules/posts/utils/post-like-state.utils';
import {
    LISTEN_PROGRESS_INTERVAL_MS,
    MIN_PROGRESS_STEP_MS,
    PLAYER_STATE_PERSIST_INTERVAL_MS,
    PLAYER_STATE_STORAGE_KEY,
} from '@/modules/posts/constants/post-player.constants';

const audioElement = new Audio();
const activePost = ref<Post | null>(null);
const isPlaying = ref(false);
const currentTimeSeconds = ref(0);
const durationSeconds = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const audioEnergy = ref(0);
const audioFrequencyBands = ref({
    low: 0,
    mid: 0,
    high: 0,
    peak: 0,
});
const countedListenVersion = ref(0);
const lastCountedPostId = ref<number | null>(null);

let isInitialized = false;
let listenProgressTimerId: number | null = null;
let currentSessionId: string | null = null;
let lastReportedPositionMs = 0;
let isStartingPlayback = false;
let isSyncingListenProgress = false;
let isFinalizingListen = false;
let hasAttemptedRestore = false;
let pendingRestoreTimeSeconds: number | null = null;
let lastPersistedAt = 0;
let activePostSyncRequestId = 0;
let audioContext: AudioContext | null = null;
let audioAnalyser: AnalyserNode | null = null;
let audioSource: MediaElementAudioSourceNode | null = null;
let audioDataArray: Uint8Array<ArrayBuffer> | null = null;
let audioTimeDomainDataArray: Uint8Array<ArrayBuffer> | null = null;
let audioEnergyAnimationFrameId: number | null = null;

const createListenSessionId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `listen-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const clearListenProgressTimer = (): void => {
    if (listenProgressTimerId !== null) {
        window.clearInterval(listenProgressTimerId);
        listenProgressTimerId = null;
    }
};

const stopAudioEnergyMeter = (): void => {
    if (audioEnergyAnimationFrameId !== null) {
        window.cancelAnimationFrame(audioEnergyAnimationFrameId);
        audioEnergyAnimationFrameId = null;
    }
};

const smoothAudioValue = (previous: number, next: number, attack = 0.12, release = 0.045): number => {
    const factor = next > previous ? attack : release;

    return previous + (next - previous) * factor;
};

const decayAudioFrequencyBands = (): void => {
    audioFrequencyBands.value = {
        low: audioFrequencyBands.value.low * 0.94,
        mid: audioFrequencyBands.value.mid * 0.945,
        high: audioFrequencyBands.value.high * 0.95,
        peak: audioFrequencyBands.value.peak * 0.92,
    };
};

const canUseAudioEnergyMeter = (): boolean => {
    if (!audioElement.currentSrc) {
        return false;
    }

    try {
        const audioUrl = new URL(audioElement.currentSrc, window.location.href);

        return audioUrl.origin === window.location.origin || ['blob:', 'data:'].includes(audioUrl.protocol);
    } catch (_error) {
        return false;
    }
};

const tickAudioEnergyMeter = (): void => {
    if (!audioAnalyser || !audioDataArray || !audioTimeDomainDataArray || audioElement.paused) {
        audioEnergy.value = Math.max(0, audioEnergy.value * 0.94);
        decayAudioFrequencyBands();
        audioEnergyAnimationFrameId = null;
        return;
    }

    audioAnalyser.getByteFrequencyData(audioDataArray);
    audioAnalyser.getByteTimeDomainData(audioTimeDomainDataArray);
    const timeDomainData = audioTimeDomainDataArray;

    const averageBins = (start: number, end: number): number => {
        let total = 0;
        const safeEnd = Math.min(end, audioDataArray?.length ?? 0);

        for (let index = start; index < safeEnd; index += 1) {
            total += audioDataArray?.[index] ?? 0;
        }

        return total / Math.max(1, safeEnd - start);
    };

    const getWaveformMetrics = (): { peak: number; rms: number; motion: number } => {
        let maxAmplitude = 0;
        let totalSquare = 0;
        let totalMotion = 0;
        let previousSample = 0;

        for (let index = 0; index < timeDomainData.length; index += 1) {
            const normalizedSample = ((timeDomainData[index] ?? 128) - 128) / 128;
            const amplitude = Math.abs(normalizedSample);

            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
            }

            totalSquare += normalizedSample * normalizedSample;

            if (index > 0) {
                totalMotion += Math.abs(normalizedSample - previousSample);
            }

            previousSample = normalizedSample;
        }

        return {
            peak: maxAmplitude,
            rms: Math.sqrt(totalSquare / Math.max(1, timeDomainData.length)),
            motion: totalMotion / Math.max(1, timeDomainData.length - 1),
        };
    };

    let maxFrequencyPeak = 0;

    for (let index = 0; index < Math.min(78, audioDataArray.length); index += 1) {
        const value = audioDataArray[index] ?? 0;

        if (value > maxFrequencyPeak) {
            maxFrequencyPeak = value;
        }
    }

    const waveform = getWaveformMetrics();
    const normalizedWaveformRms = Math.min(1, Math.max(0, (waveform.rms - 0.01) / 0.18));
    const normalizedWaveformPeak = Math.min(1, Math.max(0, (waveform.peak - 0.02) / 0.54));
    const normalizedWaveformMotion = Math.min(1, Math.max(0, waveform.motion / 0.12));
    const low = Math.min(1, Math.max(0, averageBins(1, 12) / 146));
    const mid = Math.min(1, Math.max(0, averageBins(12, 36) / 154));
    const high = Math.min(1, Math.max(0, averageBins(36, 96) / 150));
    const peak = Math.min(1, Math.max(0, maxFrequencyPeak / 255));
    const normalizedEnergy = Math.min(
        1,
        low * 0.34
            + mid * 0.22
            + high * 0.1
            + peak * 0.08
            + normalizedWaveformRms * 0.18
            + normalizedWaveformPeak * 0.05
            + normalizedWaveformMotion * 0.03,
    );

    audioFrequencyBands.value = {
        low: smoothAudioValue(audioFrequencyBands.value.low, Math.min(1, low * 0.76 + normalizedWaveformRms * 0.24), 0.2, 0.07),
        mid: smoothAudioValue(audioFrequencyBands.value.mid, Math.min(1, mid * 0.78 + normalizedWaveformMotion * 0.22), 0.18, 0.065),
        high: smoothAudioValue(audioFrequencyBands.value.high, Math.min(1, high * 0.74 + normalizedWaveformPeak * 0.26), 0.15, 0.055),
        peak: smoothAudioValue(audioFrequencyBands.value.peak, Math.min(1, peak * 0.68 + normalizedWaveformPeak * 0.32), 0.24, 0.1),
    };
    audioEnergy.value = smoothAudioValue(audioEnergy.value, normalizedEnergy, 0.22, 0.075);
    audioEnergyAnimationFrameId = window.requestAnimationFrame(tickAudioEnergyMeter);
};

const startAudioEnergyMeter = async (): Promise<void> => {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined' || !canUseAudioEnergyMeter()) {
        return;
    }

    try {
        audioContext ??= new AudioContext();

        if (!audioSource) {
            audioSource = audioContext.createMediaElementSource(audioElement);
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 1024;
            audioAnalyser.smoothingTimeConstant = 0.78;
            audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
            audioTimeDomainDataArray = new Uint8Array(audioAnalyser.fftSize);
            audioSource.connect(audioAnalyser);
            audioAnalyser.connect(audioContext.destination);
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        stopAudioEnergyMeter();
        audioEnergyAnimationFrameId = window.requestAnimationFrame(tickAudioEnergyMeter);
    } catch (error) {
        audioEnergy.value = 0;
        audioFrequencyBands.value = { low: 0, mid: 0, high: 0, peak: 0 };
        console.error('Failed to initialize audio energy meter.', error);
    }
};

const getStoredPlayerState = (): StoredPostPlayerState | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const rawState = window.sessionStorage.getItem(PLAYER_STATE_STORAGE_KEY);

        if (!rawState) {
            return null;
        }

        return JSON.parse(rawState) as StoredPostPlayerState;
    } catch (_error) {
        return null;
    }
};

const clearStoredPlayerState = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(PLAYER_STATE_STORAGE_KEY);
};

const persistPlayerState = (force = false): void => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!activePost.value?.audioFileUrl) {
        clearStoredPlayerState();
        return;
    }

    const now = Date.now();

    if (!force && now - lastPersistedAt < PLAYER_STATE_PERSIST_INTERVAL_MS) {
        return;
    }

    const state: StoredPostPlayerState = {
        post: activePost.value,
        currentTimeSeconds: currentTimeSeconds.value,
        volume: volume.value,
        isMuted: isMuted.value,
    };

    window.sessionStorage.setItem(PLAYER_STATE_STORAGE_KEY, JSON.stringify(state));
    lastPersistedAt = now;
};

const getCurrentPositionMs = (): number => Math.max(0, Math.floor(audioElement.currentTime * 1000));

const resetProgressState = (): void => {
    currentSessionId = null;
    lastReportedPositionMs = 0;
};

const clearActivePostState = (): void => {
    audioElement.removeAttribute('src');
    audioElement.load();
    activePost.value = null;
    durationSeconds.value = 0;
    currentTimeSeconds.value = 0;
    clearStoredPlayerState();
    pendingRestoreTimeSeconds = null;
};

const notifyCountedListen = (postId: number): void => {
    lastCountedPostId.value = postId;
    countedListenVersion.value += 1;
};

const syncAudioState = (): void => {
    currentTimeSeconds.value = Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0;
    durationSeconds.value = Number.isFinite(audioElement.duration) && audioElement.duration > 0
        ? audioElement.duration
        : activePost.value?.audioDurationSeconds ?? 0;
    persistPlayerState();
};

const handleLoadedMetadata = (): void => {
    if (pendingRestoreTimeSeconds !== null) {
        audioElement.currentTime = Math.max(0, pendingRestoreTimeSeconds);
        currentTimeSeconds.value = audioElement.currentTime;
        pendingRestoreTimeSeconds = null;
    }

    syncAudioState();
};

const handleTimeUpdate = (): void => {
    syncAudioState();
};

const handlePlay = (): void => {
    isPlaying.value = true;
    void startAudioEnergyMeter();
    persistPlayerState(true);
};

const handlePause = (): void => {
    isPlaying.value = false;
    stopAudioEnergyMeter();
    audioEnergy.value = 0;
    persistPlayerState(true);
};

const startListenProgressTimer = (postsStore: ReturnType<typeof usePostsStore>): void => {
    clearListenProgressTimer();
    listenProgressTimerId = window.setInterval(() => {
        void syncListenProgress(postsStore);
    }, LISTEN_PROGRESS_INTERVAL_MS);
};

const syncListenProgress = async (postsStore: ReturnType<typeof usePostsStore>, force = false): Promise<void> => {
    const session = postsStore.currentListenSession;
    const postId = activePost.value?.postId;

    if (!session || postId === undefined || session.postId !== postId || isSyncingListenProgress) {
        return;
    }

    const positionMs = getCurrentPositionMs();

    if (!force && positionMs - lastReportedPositionMs < MIN_PROGRESS_STEP_MS) {
        return;
    }

    isSyncingListenProgress = true;

    try {
        const response = await postsStore.updateListenProgress(postId, {
            token: session.token,
            positionMs,
        });

        lastReportedPositionMs = Math.max(lastReportedPositionMs, positionMs, response.listenedMs);
    } catch (error) {
        console.error('Failed to sync listen progress.', error);
    } finally {
        isSyncingListenProgress = false;
    }
};

const finalizeCurrentListen = async (
    postsStore: ReturnType<typeof usePostsStore>,
    postId: number,
    positionMs: number,
): Promise<void> => {
    const session = postsStore.currentListenSession;

    if (!session || session.postId !== postId || isFinalizingListen) {
        return;
    }

    isFinalizingListen = true;

    try {
        const response = await postsStore.endListen(postId, {
            token: session.token,
            positionMs,
            sessionId: currentSessionId ?? session.sessionId,
        });

        if (response.counted) {
            postsStore.incrementPostListens(postId);
            notifyCountedListen(postId);
        }
    } catch (error) {
        console.error('Failed to finalize listen session.', error);
    } finally {
        isFinalizingListen = false;
        resetProgressState();
        postsStore.clearCurrentListenSession();
    }
};

const ensureListenSession = async (
    postsStore: ReturnType<typeof usePostsStore>,
    post: Post,
): Promise<void> => {
    const currentSession = postsStore.currentListenSession;

    if (currentSession?.postId === post.postId) {
        return;
    }

    currentSessionId = createListenSessionId();
    lastReportedPositionMs = 0;

    try {
        await postsStore.startListen(post.postId, {
            sessionId: currentSessionId,
        });

        lastReportedPositionMs = postsStore.currentListenSession?.listenedMs ?? 0;
    } catch (error) {
        console.error('Failed to start listen session.', error);
        currentSessionId = null;
    }
};

const teardownCurrentPost = async (
    postsStore: ReturnType<typeof usePostsStore>,
    options: {
        clearPost?: boolean;
        resetTime?: boolean;
    } = {},
): Promise<void> => {
    const {
        clearPost = false,
        resetTime = false,
    } = options;

    clearListenProgressTimer();

    if (!audioElement.paused) {
        audioElement.pause();
    }

    const postId = activePost.value?.postId;

    if (postId !== undefined && postsStore.currentListenSession?.postId === postId) {
        await syncListenProgress(postsStore, true);
        await finalizeCurrentListen(postsStore, postId, getCurrentPositionMs());
    } else {
        resetProgressState();
        postsStore.clearCurrentListenSession();
    }

    if (resetTime) {
        audioElement.currentTime = 0;
        currentTimeSeconds.value = 0;
    }

    if (clearPost) {
        clearActivePostState();
    }
};

const handleEnded = async (): Promise<void> => {
    const postsStore = usePostsStore();

    stopAudioEnergyMeter();
    audioEnergy.value = 0;
    const postId = activePost.value?.postId;

    clearListenProgressTimer();

    if (postId !== undefined) {
        await syncListenProgress(postsStore, true);
        await finalizeCurrentListen(postsStore, postId, getCurrentPositionMs());
    }

    audioElement.currentTime = 0;
    currentTimeSeconds.value = 0;
    isPlaying.value = false;
};

const ensureInitialized = (): void => {
    if (isInitialized) {
        return;
    }

    audioElement.preload = 'metadata';
    audioElement.volume = volume.value;
    audioElement.muted = isMuted.value;
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', () => {
        void handleEnded();
    });

    isInitialized = true;
};

export const usePostPlayer = () => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();

    ensureInitialized();

    const hasActivePost = computed(() => !!activePost.value);
    const activePostId = computed<number | null>(() => activePost.value?.postId ?? null);
    const progressPercent = computed(() => {
        if (!durationSeconds.value) {
            return 0;
        }

        return Math.min(100, (currentTimeSeconds.value / durationSeconds.value) * 100);
    });

    const playPost = async (post: Post): Promise<void> => {
        if (!post.audioFileUrl || isStartingPlayback) {
            return;
        }

        isStartingPlayback = true;

        try {
            const isSamePost = activePost.value?.postId === post.postId;

            if (!isSamePost && activePost.value) {
                await teardownCurrentPost(postsStore, {
                    clearPost: true,
                });
            }

            if (!isSamePost) {
                audioElement.src = post.audioFileUrl;
                audioElement.load();
                audioElement.currentTime = 0;
                activePost.value = applyRememberedPostLikeState(post);
                currentTimeSeconds.value = 0;
                durationSeconds.value = post.audioDurationSeconds ?? 0;
                resetProgressState();
                pendingRestoreTimeSeconds = null;
                persistPlayerState(true);
            } else {
                activePost.value = applyRememberedPostLikeState(post);
            }

            await ensureListenSession(postsStore, post);
            await audioElement.play();
            startListenProgressTimer(postsStore);
        } catch (error) {
            isPlaying.value = false;
            console.error('Failed to start post playback.', error);
        } finally {
            isStartingPlayback = false;
        }
    };

    const pausePlayback = async (): Promise<void> => {
        clearListenProgressTimer();

        if (!audioElement.paused) {
            audioElement.pause();
        }

        await syncListenProgress(postsStore, true);
    };

    const resumePlayback = async (): Promise<void> => {
        const post = activePost.value;

        if (!post) {
            return;
        }

        await ensureListenSession(postsStore, post);
        await audioElement.play();
        startListenProgressTimer(postsStore);
    };

    const togglePostPlayback = async (post: Post): Promise<void> => {
        if (activePost.value?.postId === post.postId) {
            syncActivePost(post);

            if (isPlaying.value) {
                await pausePlayback();
                return;
            }

            await resumePlayback();
            return;
        }

        await playPost(post);
    };

    const closePlayer = async (): Promise<void> => {
        const postId = activePost.value?.postId;
        const positionMs = getCurrentPositionMs();
        const session = postId !== undefined && postsStore.currentListenSession?.postId === postId
            ? postsStore.currentListenSession
            : null;

        clearListenProgressTimer();

        if (!audioElement.paused) {
            audioElement.pause();
        }

        clearActivePostState();
        resetProgressState();

        if (!session || postId === undefined) {
            postsStore.clearCurrentListenSession();
            return;
        }

        try {
            await postsStore.updateListenProgress(postId, {
                token: session.token,
                positionMs,
            });
        } catch (error) {
            console.error('Failed to sync listen progress before closing player.', error);
        }

        await finalizeCurrentListen(postsStore, postId, positionMs);
    };

    const seekToPercent = async (nextPercent: number): Promise<void> => {
        if (!activePost.value || !durationSeconds.value) {
            return;
        }

        const normalizedPercent = Math.min(100, Math.max(0, nextPercent));
        const targetTimeSeconds = (normalizedPercent / 100) * durationSeconds.value;
        audioElement.currentTime = targetTimeSeconds;
        currentTimeSeconds.value = targetTimeSeconds;
        persistPlayerState(true);

        if (isPlaying.value) {
            startListenProgressTimer(postsStore);
            return;
        }

        await syncListenProgress(postsStore, true);
    };

    const toggleMute = (): void => {
        isMuted.value = !isMuted.value;
        audioElement.muted = isMuted.value;
    };

    const syncActivePost = (nextPost: Post): void => {
        if (activePost.value?.postId !== nextPost.postId) {
            return;
        }

        activePost.value = {
            ...activePost.value,
            ...applyRememberedPostLikeState(nextPost),
        };
        persistPlayerState(true);
    };

    const refreshActivePostState = async (): Promise<void> => {
        const postId = activePost.value?.postId;

        if (!postId || !authStore.isInitialized || !authStore.isAuthenticated) {
            return;
        }

        const requestId = ++activePostSyncRequestId;

        try {
            const latestPost = await postsStore.fetchPost(postId);

            if (requestId !== activePostSyncRequestId || activePost.value?.postId !== postId) {
                return;
            }

            syncActivePost(latestPost);
        } catch (_error) {
            return;
        }
    };

    const setVolume = (nextVolume: number): void => {
        const normalizedVolume = Math.min(1, Math.max(0, nextVolume));

        volume.value = normalizedVolume;
        audioElement.volume = normalizedVolume;

        if (normalizedVolume > 0 && isMuted.value) {
            isMuted.value = false;
            audioElement.muted = false;
        }

        persistPlayerState(true);
    };

    const restorePlayerState = async (): Promise<void> => {
        if (hasAttemptedRestore) {
            return;
        }

        hasAttemptedRestore = true;

        const storedState = getStoredPlayerState();

        if (!storedState?.post.audioFileUrl) {
            clearStoredPlayerState();
            return;
        }

        activePost.value = applyRememberedPostLikeState(storedState.post);
        currentTimeSeconds.value = Math.max(0, storedState.currentTimeSeconds);
        durationSeconds.value = storedState.post.audioDurationSeconds ?? 0;
        volume.value = Math.min(1, Math.max(0, storedState.volume));
        isMuted.value = storedState.isMuted;
        audioElement.volume = volume.value;
        audioElement.muted = isMuted.value;
        audioElement.src = storedState.post.audioFileUrl;
        audioElement.load();
        pendingRestoreTimeSeconds = currentTimeSeconds.value;
        persistPlayerState(true);

        if (!authStore.isInitialized && authStore.token) {
            return;
        }

        const requestId = ++activePostSyncRequestId;

        try {
            const latestPost = await postsStore.fetchPost(storedState.post.postId);

            if (requestId !== activePostSyncRequestId || activePost.value?.postId !== storedState.post.postId) {
                return;
            }

            if (!latestPost.audioFileUrl) {
                await closePlayer();
                return;
            }

            activePost.value = latestPost;
            durationSeconds.value = latestPost.audioDurationSeconds ?? durationSeconds.value;

            if (audioElement.src !== latestPost.audioFileUrl) {
                audioElement.src = latestPost.audioFileUrl;
                audioElement.load();
                pendingRestoreTimeSeconds = currentTimeSeconds.value;
            }

            persistPlayerState(true);
        } catch (_error) {
            return;
        }
    };

    void restorePlayerState();

    watch(
        [() => authStore.isInitialized, () => authStore.token, activePostId],
        ([isInitialized, token, postId], [prevIsInitialized, prevToken, prevPostId]) => {
            if (
                !isInitialized
                || !token
                || !postId
                || (prevIsInitialized === isInitialized && prevToken === token && prevPostId === postId)
            ) {
                return;
            }

            void refreshActivePostState();
        },
        { immediate: true },
    );

    return {
        activePost,
        activePostId,
        countedListenVersion,
        currentTimeSeconds,
        durationSeconds,
        audioEnergy,
        audioFrequencyBands,
        hasActivePost,
        isMuted,
        isPlaying,
        lastCountedPostId,
        pausePlayback,
        playPost,
        progressPercent,
        resumePlayback,
        setVolume,
        seekToPercent,
        syncActivePost,
        toggleMute,
        togglePostPlayback,
        closePlayer,
        volume,
        audioElement
    };
};
