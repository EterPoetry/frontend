import { formatSecondsToClock } from '@/shared/utils/time.utils';

const postDateFormatter = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export const formatPostDate = (value: string): string => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return postDateFormatter.format(date);
};

export const formatPostDuration = (audioDurationSeconds: number | null): string => {
    if (audioDurationSeconds === null) {
        return '00:00';
    }

    return formatSecondsToClock(audioDurationSeconds);
};

export const formatPostTag = (value: string): string => {
    return `#${value.trim()}`;
};
