import {
    AUDIO_FILE_EXTENSION_BY_TYPE,
} from '@/modules/posts/constants/post-audio.constants';

export const getAudioFileName = (audio: Blob): string => {
    if (audio instanceof File) {
        return audio.name;
    }

    const extension = AUDIO_FILE_EXTENSION_BY_TYPE[audio.type] ?? 'bin';

    return `audio.${extension}`;
};

export const buildAudioFormData = (audio: Blob): FormData => {
    const formData = new FormData();

    formData.append('audio', audio, getAudioFileName(audio));

    return formData;
};
