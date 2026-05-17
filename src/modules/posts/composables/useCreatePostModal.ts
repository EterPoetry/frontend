import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { AxiosError } from 'axios';
import { usePostsStore } from '@/modules/posts/posts.store';
import {
    MAX_AUDIO_FILE_SIZE_BYTES,
    SUPPORTED_AUDIO_EXTENSIONS,
} from '@/modules/posts/constants/post-audio.constants';
import { PostsEvents } from '@/modules/posts/enums/posts-events.enum';
import { AudioSelection } from '@/modules/posts/interfaces/audio-selection.interface';
import { CreatePostModalEmits } from '@/modules/posts/interfaces/create-post-modal-emits.interface';
import { CreatePostModalProps } from '@/modules/posts/interfaces/create-post-modal-props.interface';
import { RecordingFormatProfile } from '@/modules/posts/interfaces/recording-format-profile.interface';
import { TIME_CONVERSION } from '@/shared/constants/time.constants';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';

type CreatePostMode = 'record' | 'upload';
const MICROPHONE_REQUEST_TIMEOUT_MS = 10000;

const RECORDING_FORMAT_PROFILES: RecordingFormatProfile[] = [
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', fileExtension: 'm4a', audioBitsPerSecond: 320000 },
    { mimeType: 'audio/mp4', fileExtension: 'm4a', audioBitsPerSecond: 320000 },
    { mimeType: 'audio/aac', fileExtension: 'aac', audioBitsPerSecond: 320000 },
    { mimeType: 'audio/ogg;codecs=opus', fileExtension: 'ogg', audioBitsPerSecond: 256000 },
    { mimeType: 'audio/ogg', fileExtension: 'ogg', audioBitsPerSecond: 256000 },
];

const RAW_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 24 },
};

const RECORDING_DEBUG_PREFIX = '[CreatePostModal recording]';

const createEmptySelection = (): AudioSelection => ({
    file: null,
    previewUrl: '',
    title: '',
});

const getMicrophonePermissionState = async (): Promise<PermissionState | null> => {
    if (!navigator.permissions?.query) {
        return null;
    }

    try {
        const status = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
        });

        return status.state;
    } catch (error) {
        console.warn(`${RECORDING_DEBUG_PREFIX} Failed to query microphone permission state.`, error);
        return null;
    }
};

export const useCreatePostModal = (
    props: CreatePostModalProps,
    emit: CreatePostModalEmits,
) => {
    const postsStore = usePostsStore();

    const activeMode = ref<CreatePostMode>('record');
    const isDragging = ref(false);
    const isSubmitting = ref(false);
    const isProcessing = ref(false);
    const isRecording = ref(false);
    const isRequestingMicrophoneAccess = ref(false);
    const isRemoveRecordConfirmOpen = ref(false);
    const errorMessage = ref('');
    const recordedDurationSeconds = ref(0);
    const mediaStream = ref<MediaStream | null>(null);
    const mediaRecorder = ref<MediaRecorder | null>(null);
    const recordingIntervalId = ref<number | null>(null);
    const recordedChunks = ref<Blob[]>([]);
    const fileInput = ref<HTMLInputElement | null>(null);
    const recordSelection = ref<AudioSelection>(createEmptySelection());
    const uploadSelection = ref<AudioSelection>(createEmptySelection());

    const durationLimitSeconds = computed(() => props.durationLimitMinutes * TIME_CONVERSION.SECONDS_PER_MINUTE);
    const formattedLimit = computed(() => `${props.durationLimitMinutes} ${uk.posts.modal.minutesSuffix}`);
    const supportedFormatsLabel = computed(() => SUPPORTED_AUDIO_EXTENSIONS.join(', '));
    const currentSelection = computed(() => activeMode.value === 'record' ? recordSelection.value : uploadSelection.value);
    const hasSelection = computed(() => Boolean(currentSelection.value.file && currentSelection.value.previewUrl));
    const currentSelectionFile = computed(() => currentSelection.value.file);
    const currentSelectionPreviewUrl = computed(() => currentSelection.value.previewUrl);
    const currentSelectionTitle = computed(() => currentSelection.value.title);
    const hasUnsavedRecordedAudio = computed(() => Boolean(recordSelection.value.file) && props.isOpen && !isSubmitting.value && !isProcessing.value);
    const canSubmit = computed(() => hasSelection.value && !isSubmitting.value && !isProcessing.value && !isRecording.value);
    const recordingProgressLabel = computed(() => `${formatSecondsToClock(recordedDurationSeconds.value)} / ${formatSecondsToClock(durationLimitSeconds.value)}`);

    const revokeSelectionPreview = (selection: AudioSelection): void => {
        if (selection.previewUrl) {
            URL.revokeObjectURL(selection.previewUrl);
        }
    };

    const stopRecordingTimer = (): void => {
        if (recordingIntervalId.value !== null) {
            window.clearInterval(recordingIntervalId.value);
            recordingIntervalId.value = null;
        }
    };

    const cleanupMediaStream = (): void => {
        mediaStream.value?.getTracks().forEach((track) => track.stop());
        mediaStream.value = null;
    };

    const resetSelection = (mode: CreatePostMode): void => {
        const selection = mode === 'record' ? recordSelection.value : uploadSelection.value;

        revokeSelectionPreview(selection);
        Object.assign(selection, createEmptySelection());
    };

    const resetState = (): void => {
        errorMessage.value = '';
        isDragging.value = false;
        isSubmitting.value = false;
        isProcessing.value = false;
        isRecording.value = false;
        isRequestingMicrophoneAccess.value = false;
        recordedDurationSeconds.value = 0;
        recordedChunks.value = [];
        stopRecordingTimer();
        cleanupMediaStream();
        resetSelection('record');
        resetSelection('upload');

        if (fileInput.value) {
            fileInput.value.value = '';
        }
    };

    const createRecordedFileName = (): string => {
        const now = new Date();
        const date = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        return `${uk.posts.modal.recordingPrefix} ${date} ${time}`;
    };

    const loadFileDuration = async (file: File): Promise<number> => {
        const objectUrl = URL.createObjectURL(file);

        try {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';

            return await new Promise<number>((resolve, reject) => {
                audio.onloadedmetadata = () => resolve(audio.duration || 0);
                audio.onerror = () => reject(new Error('Failed to load audio metadata.'));
                audio.src = objectUrl;
            });
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    };

    const validateAudioFile = async (file: File): Promise<string | null> => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';

        if (!SUPPORTED_AUDIO_EXTENSIONS.includes(fileExtension)) {
            return uk.posts.modal.errors.unsupportedFormat;
        }

        if (file.size === 0) {
            return uk.posts.modal.errors.emptyFile;
        }

        if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
            return uk.posts.modal.errors.fileTooLarge;
        }

        const duration = await loadFileDuration(file);
        if (duration > durationLimitSeconds.value) {
            return uk.posts.modal.errors.durationExceeded(props.durationLimitMinutes);
        }

        return null;
    };

    const setSelectedAudio = (file: File, title: string): void => {
        const selection = activeMode.value === 'record' ? recordSelection.value : uploadSelection.value;

        revokeSelectionPreview(selection);
        selection.file = file;
        selection.previewUrl = URL.createObjectURL(file);
        selection.title = title;
    };

    const getSupportedRecordingProfile = (): RecordingFormatProfile | null => {
        if (!window.MediaRecorder) {
            console.warn(`${RECORDING_DEBUG_PREFIX} MediaRecorder is unavailable.`);
            return null;
        }

        if (typeof MediaRecorder.isTypeSupported !== 'function') {
            console.info(`${RECORDING_DEBUG_PREFIX} MediaRecorder.isTypeSupported is unavailable, using first profile fallback.`, RECORDING_FORMAT_PROFILES[0] ?? null);
            return RECORDING_FORMAT_PROFILES[0] ?? null;
        }

        const supportedProfile = RECORDING_FORMAT_PROFILES.find((profile) => MediaRecorder.isTypeSupported(profile.mimeType)) ?? null;
        console.info(`${RECORDING_DEBUG_PREFIX} Selected recording profile.`, supportedProfile);

        return supportedProfile;
    };

    const requestRecordingStream = async (): Promise<MediaStream> => {
        const permissionState = await getMicrophonePermissionState();
        console.info(`${RECORDING_DEBUG_PREFIX} Requesting media stream.`, {
            audioConstraints: true,
            isSecureContext: window.isSecureContext,
            origin: window.location.origin,
            visibilityState: document.visibilityState,
            permissionState,
        });

        const stream = await Promise.race([
            navigator.mediaDevices.getUserMedia({ audio: true }),
            new Promise<never>((_, reject) => {
                window.setTimeout(() => {
                    reject(new Error('Microphone access request timed out.'));
                }, MICROPHONE_REQUEST_TIMEOUT_MS);
            }),
        ]);
        console.info(`${RECORDING_DEBUG_PREFIX} Media stream acquired.`, {
            trackSettings: stream.getAudioTracks().map((track) => track.getSettings()),
            trackConstraints: stream.getAudioTracks().map((track) => track.getConstraints()),
        });

        await Promise.allSettled(stream.getAudioTracks().map(async (track) => {
            if (typeof track.applyConstraints !== 'function') {
                return;
            }

            try {
                await track.applyConstraints(RAW_AUDIO_CONSTRAINTS);
                console.info(`${RECORDING_DEBUG_PREFIX} Applied raw audio constraints.`, {
                    trackSettings: track.getSettings(),
                    trackConstraints: track.getConstraints(),
                });
            } catch (error) {
                console.warn(`${RECORDING_DEBUG_PREFIX} Failed to apply raw audio constraints.`, {
                    error,
                    requestedConstraints: RAW_AUDIO_CONSTRAINTS,
                    trackSettings: track.getSettings(),
                });
            }
        }));

        return stream;
    };

    const createMediaRecorderInstance = (
        stream: MediaStream,
        profile: RecordingFormatProfile,
    ): MediaRecorder => {
        const recorderOptions: MediaRecorderOptions[] = [
            {
                mimeType: profile.mimeType,
                audioBitsPerSecond: profile.audioBitsPerSecond,
            },
            {
                mimeType: profile.mimeType,
            },
            {
                audioBitsPerSecond: profile.audioBitsPerSecond,
            },
            {},
        ];

        let lastError: unknown = null;

        for (const options of recorderOptions) {
            try {
                console.info(`${RECORDING_DEBUG_PREFIX} Creating MediaRecorder.`, {
                    options,
                });
                return new MediaRecorder(stream, options);
            } catch (error) {
                console.warn(`${RECORDING_DEBUG_PREFIX} Failed to create MediaRecorder.`, {
                    options,
                    error,
                });
                lastError = error;
            }
        }

        throw lastError;
    };

    const applySelectedFile = async (file: File): Promise<void> => {
        errorMessage.value = '';

        const validationError = await validateAudioFile(file);
        if (validationError) {
            errorMessage.value = validationError;
            return;
        }

        setSelectedAudio(file, file.name);
    };

    const handleNativeFileSelection = async (event: Event): Promise<void> => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
            return;
        }

        await applySelectedFile(file);
    };

    const handleDrop = async (event: DragEvent): Promise<void> => {
        event.preventDefault();
        isDragging.value = false;

        const file = event.dataTransfer?.files?.[0];
        if (!file) {
            return;
        }

        await applySelectedFile(file);
    };

    const openFilePicker = (): void => {
        fileInput.value?.click();
    };

    const removeSelectedAudio = (): void => {
        errorMessage.value = '';
        resetSelection(activeMode.value);
        isRemoveRecordConfirmOpen.value = false;
    };

    const handleRemoveSelection = (): void => {
        if (activeMode.value === 'record' && recordSelection.value.file) {
            isRemoveRecordConfirmOpen.value = true;
            return;
        }

        removeSelectedAudio();
    };

    const closeRemoveRecordConfirm = (): void => {
        isRemoveRecordConfirmOpen.value = false;
    };

    const stopRecording = (): void => {
        if (!mediaRecorder.value || mediaRecorder.value.state === 'inactive') {
            console.info(`${RECORDING_DEBUG_PREFIX} Stop requested, but recorder is inactive.`);
            return;
        }

        console.info(`${RECORDING_DEBUG_PREFIX} Stopping recording.`, {
            state: mediaRecorder.value.state,
            durationSeconds: recordedDurationSeconds.value,
        });
        mediaRecorder.value.requestData();
        mediaRecorder.value.stop();
        stopRecordingTimer();
        cleanupMediaStream();
        isRecording.value = false;
    };

    const startRecording = async (): Promise<void> => {
        errorMessage.value = '';
        console.info(`${RECORDING_DEBUG_PREFIX} Start recording requested.`, {
            hasMediaRecorder: !!window.MediaRecorder,
            hasMediaDevices: !!navigator.mediaDevices,
            hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
        });

        if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
            errorMessage.value = uk.posts.modal.errors.recordingUnavailable;
            console.warn(`${RECORDING_DEBUG_PREFIX} Recording is unavailable in this environment.`);
            return;
        }

        const supportedProfile = getSupportedRecordingProfile();

        if (!supportedProfile) {
            errorMessage.value = uk.posts.modal.errors.recordingUnsupported;
            console.warn(`${RECORDING_DEBUG_PREFIX} No supported recording profile found.`);
            return;
        }

        try {
            resetSelection('record');
            recordedChunks.value = [];
            recordedDurationSeconds.value = 0;
            isRequestingMicrophoneAccess.value = true;

            mediaStream.value = await requestRecordingStream();
            mediaRecorder.value = createMediaRecorderInstance(mediaStream.value, supportedProfile);
            console.info(`${RECORDING_DEBUG_PREFIX} MediaRecorder created.`, {
                mimeType: mediaRecorder.value.mimeType,
                state: mediaRecorder.value.state,
            });

            mediaRecorder.value.addEventListener('error', (event) => {
                console.error(`${RECORDING_DEBUG_PREFIX} Recorder error event.`, event);
                errorMessage.value = uk.posts.modal.errors.recordingUnavailable;
                stopRecordingTimer();
                cleanupMediaStream();
                isRecording.value = false;
            });

            mediaRecorder.value.addEventListener('dataavailable', (event: BlobEvent) => {
                console.info(`${RECORDING_DEBUG_PREFIX} dataavailable event.`, {
                    chunkSize: event.data.size,
                    chunkType: event.data.type,
                });
                if (event.data.size > 0) {
                    recordedChunks.value.push(event.data);
                }
            });

            mediaRecorder.value.addEventListener('stop', () => {
                const blob = new Blob(recordedChunks.value, { type: supportedProfile.mimeType });
                const baseFileName = createRecordedFileName();
                console.info(`${RECORDING_DEBUG_PREFIX} Recorder stopped.`, {
                    chunks: recordedChunks.value.length,
                    blobSize: blob.size,
                    blobType: blob.type,
                    fileName: `${baseFileName}.${supportedProfile.fileExtension}`,
                });
                const recordedFile = new File([blob], `${baseFileName}.${supportedProfile.fileExtension}`, {
                    type: supportedProfile.mimeType,
                });

                activeMode.value = 'record';
                setSelectedAudio(recordedFile, baseFileName);
            }, { once: true });

            mediaRecorder.value.start(250);
            isRecording.value = true;
            console.info(`${RECORDING_DEBUG_PREFIX} Recording started.`, {
                state: mediaRecorder.value.state,
            });
            recordingIntervalId.value = window.setInterval(() => {
                recordedDurationSeconds.value += 1;

                if (recordedDurationSeconds.value >= durationLimitSeconds.value) {
                    console.info(`${RECORDING_DEBUG_PREFIX} Recording reached duration limit.`);
                    stopRecording();
                }
            }, TIME_CONVERSION.MS_PER_SECOND);
            isRequestingMicrophoneAccess.value = false;
        } catch (error) {
            cleanupMediaStream();
            console.error(`${RECORDING_DEBUG_PREFIX} Failed to start recording.`, error);
            isRequestingMicrophoneAccess.value = false;
            const permissionState = await getMicrophonePermissionState();
            const isMicrophoneTimeout = error instanceof Error && error.message === 'Microphone access request timed out.';
            const isMicrophoneBlocked = error instanceof DOMException
                && error.name === 'NotAllowedError';

            console.info(`${RECORDING_DEBUG_PREFIX} Recording start failed context.`, {
                permissionState,
                errorName: error instanceof DOMException ? error.name : null,
            });

            if (isMicrophoneTimeout) {
                errorMessage.value = uk.posts.modal.errors.microphonePromptTimedOut;
                return;
            }

            if (isMicrophoneBlocked && permissionState === 'denied') {
                errorMessage.value = uk.posts.modal.errors.microphoneBlocked;
                return;
            }

            if (isMicrophoneBlocked) {
                errorMessage.value = uk.posts.modal.errors.microphoneDenied;
                return;
            }

            errorMessage.value = uk.posts.modal.errors.microphoneDenied;
        }
    };

    const closeModal = (force = false): void => {
        if (!force && (isSubmitting.value || isProcessing.value)) {
            return;
        }

        isRemoveRecordConfirmOpen.value = false;
        stopRecording();
        resetState();
        activeMode.value = 'record';
        emit(PostsEvents.CLOSE);
    };

    const handleCloseClick = (): void => {
        closeModal();
    };

    const submit = async (): Promise<void> => {
        if (!currentSelectionFile.value) {
            errorMessage.value = uk.posts.modal.errors.selectAudio;
            return;
        }

        errorMessage.value = '';
        isSubmitting.value = true;

        try {
            const createdPost = await postsStore.createPost(currentSelectionFile.value);
            emit(PostsEvents.CREATED, createdPost);
            closeModal(true);
        } catch (error: unknown) {
            isSubmitting.value = false;
            isProcessing.value = false;

            const axiosError = error as AxiosError;
            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = uk.common.errors.serverError;
                return;
            }

            errorMessage.value = uk.posts.modal.errors.createFailed;
        }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
        if (!hasUnsavedRecordedAudio.value) {
            return;
        }

        event.preventDefault();
        event.returnValue = '';
    };

    watch(() => props.isOpen, (isOpen) => {
        if (!isOpen) {
            stopRecording();
            resetState();
            activeMode.value = 'record';
        }
    });

    watch(activeMode, () => {
        errorMessage.value = '';
        isRemoveRecordConfirmOpen.value = false;
    });

    watch(hasUnsavedRecordedAudio, (hasUnsavedAudio) => {
        if (hasUnsavedAudio) {
            window.addEventListener('beforeunload', handleBeforeUnload);
            return;
        }

        window.removeEventListener('beforeunload', handleBeforeUnload);
    }, { immediate: true });

    onBeforeUnmount(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        stopRecording();
        resetState();
    });

    return {
        activeMode,
        canSubmit,
        closeRemoveRecordConfirm,
        currentSelectionPreviewUrl,
        currentSelectionTitle,
        errorMessage,
        fileInput,
        formattedLimit,
        handleCloseClick,
        handleDrop,
        handleNativeFileSelection,
        handleRemoveSelection,
        hasSelection,
        isDragging,
        isProcessing,
        isRecording,
        isRequestingMicrophoneAccess,
        isRemoveRecordConfirmOpen,
        isSubmitting,
        openFilePicker,
        recordingProgressLabel,
        removeSelectedAudio,
        startRecording,
        stopRecording,
        submit,
        supportedFormatsLabel,
    };
};
