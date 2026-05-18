import type { SyncLineErrorKind } from '@/modules/posts/interfaces/sync-line-error-kind.type';
import type { SyncValidation } from '@/modules/posts/interfaces/sync-validation.interface';
import type { PostTextSynchronizationItem } from '@/modules/posts/interfaces/post-text-synchronization-item.interface';

export const buildPostTextSynchronization = (
    synchronizationMap: Map<number, number>,
): PostTextSynchronizationItem[] => Array.from(synchronizationMap.entries())
    .map(([lineIndex, audioStartMomentMs]) => ({ lineIndex, audioStartMomentMs }))
    .sort((firstItem, secondItem) => firstItem.lineIndex - secondItem.lineIndex);

export const validatePostTextSynchronization = (
    synchronizationMap: Map<number, number>,
    syncableIndices: number[],
    audioDurationSeconds: number | null | undefined,
    shouldValidateMissing = true,
): SyncValidation => {
    const lineErrors = new Map<number, SyncLineErrorKind>();
    const sortedSynchronization = buildPostTextSynchronization(synchronizationMap);

    if (!sortedSynchronization.length) {
        return { lineErrors, isValid: true };
    }

    if (shouldValidateMissing) {
        for (const lineIndex of syncableIndices) {
            if (!synchronizationMap.has(lineIndex)) {
                lineErrors.set(lineIndex, 'missing');
            }
        }
    }

    for (let index = 1; index < sortedSynchronization.length; index += 1) {
        const previousItem = sortedSynchronization[index - 1];
        const currentItem = sortedSynchronization[index];

        if (currentItem.audioStartMomentMs <= previousItem.audioStartMomentMs && !lineErrors.has(currentItem.lineIndex)) {
            lineErrors.set(currentItem.lineIndex, 'out-of-order');
        }
    }

    const audioDurationMs = Math.round((audioDurationSeconds ?? 0) * 1000);

    if (audioDurationMs > 0) {
        for (const item of sortedSynchronization) {
            if (item.audioStartMomentMs > audioDurationMs && !lineErrors.has(item.lineIndex)) {
                lineErrors.set(item.lineIndex, 'exceeds-duration');
            }
        }
    }

    return {
        lineErrors,
        isValid: lineErrors.size === 0,
    };
};
