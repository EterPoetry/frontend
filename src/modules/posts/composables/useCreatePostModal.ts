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
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';

type CreatePostMode = 'record' | 'upload';

const RECORDING_FORMAT_PROFILES: RecordingFormatProfile[] = [
    { mimeType: 'audio/mp4;codecs=mp4a.40.2', fileExtension: 'm4a' },
    { mimeType: 'audio/mp4', fileExtension: 'm4a' },
    { mimeType: 'audio/aac', fileExtension: 'aac' },
    { mimeType: 'audio/ogg;codecs=opus', fileExtension: 'ogg' },
    { mimeType: 'audio/ogg', fileExtension: 'ogg' },
];

const createEmptySelection = (): AudioSelection => ({
    file: null,
    previewUrl: '',
    title: '',
});

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
            return null;
        }

        if (typeof MediaRecorder.isTypeSupported !== 'function') {
            return RECORDING_FORMAT_PROFILES[0] ?? null;
        }

        return RECORDING_FORMAT_PROFILES.find((profile) => MediaRecorder.isTypeSupported(profile.mimeType)) ?? null;
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
            return;
        }

        mediaRecorder.value.stop();
        stopRecordingTimer();
        cleanupMediaStream();
        isRecording.value = false;
    };

    const startRecording = async (): Promise<void> => {
        errorMessage.value = '';

        if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
            errorMessage.value = uk.posts.modal.errors.recordingUnavailable;
            return;
        }

        const supportedProfile = getSupportedRecordingProfile();

        if (!supportedProfile) {
            errorMessage.value = uk.posts.modal.errors.recordingUnsupported;
            return;
        }

        try {
            resetSelection('record');
            recordedChunks.value = [];
            recordedDurationSeconds.value = 0;

            mediaStream.value = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.value = new MediaRecorder(mediaStream.value, {
                mimeType: supportedProfile.mimeType,
            });

            mediaRecorder.value.addEventListener('dataavailable', (event: BlobEvent) => {
                if (event.data.size > 0) {
                    recordedChunks.value.push(event.data);
                }
            });

            mediaRecorder.value.addEventListener('stop', () => {
                const blob = new Blob(recordedChunks.value, { type: supportedProfile.mimeType });
                const baseFileName = createRecordedFileName();
                const recordedFile = new File([blob], `${baseFileName}.${supportedProfile.fileExtension}`, {
                    type: supportedProfile.mimeType,
                });

                activeMode.value = 'record';
                setSelectedAudio(recordedFile, baseFileName);
            }, { once: true });

            mediaRecorder.value.start();
            isRecording.value = true;
            recordingIntervalId.value = window.setInterval(() => {
                recordedDurationSeconds.value += 1;

                if (recordedDurationSeconds.value >= durationLimitSeconds.value) {
                    stopRecording();
                }
            }, TIME_CONVERSION.MS_PER_SECOND);
        } catch (error) {
            cleanupMediaStream();
            errorMessage.value = getApiErrorMessage(error) || uk.posts.modal.errors.microphoneDenied;
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

            errorMessage.value = getApiErrorMessage(error) || uk.posts.modal.errors.createFailed;
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
