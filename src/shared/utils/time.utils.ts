import { TIME_CONVERSION } from '@/shared/constants/time.constants';

export const sleep = async (ms: number): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
};

export const formatSecondsToClock = (value: number): string => {
    if (!Number.isFinite(value) || value < 0) {
        return '00:00';
    }

    const safeSeconds = Math.floor(value);
    const minutes = Math.floor(safeSeconds / TIME_CONVERSION.SECONDS_PER_MINUTE);
    const seconds = safeSeconds % TIME_CONVERSION.SECONDS_PER_MINUTE;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
