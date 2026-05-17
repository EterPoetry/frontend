import type { PostTextSynchronizationItem } from '@/modules/posts/interfaces/post-text-synchronization-item.interface';

export interface UpdatePostTextSynchronizationPayload {
    textSynchronization: PostTextSynchronizationItem[];
}
