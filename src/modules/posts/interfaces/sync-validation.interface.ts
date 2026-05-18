import type { SyncLineErrorKind } from '@/modules/posts/interfaces/sync-line-error-kind.type';

export interface SyncValidation {
    lineErrors: Map<number, SyncLineErrorKind>;
    isValid: boolean;
}
