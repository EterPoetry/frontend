export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'flac'];
export const SUPPORTED_AUDIO_ACCEPT = SUPPORTED_AUDIO_EXTENSIONS.map((extension) => `.${extension}`).join(',');
export const MAX_AUDIO_FILE_SIZE_BYTES = 80 * 1024 * 1024;

export const AUDIO_FILE_EXTENSION_BY_TYPE: Record<string, string> = {
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/m4a': 'm4a',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/wav': 'wav',
    'audio/x-m4a': 'm4a',
    'audio/x-wav': 'wav',
};
