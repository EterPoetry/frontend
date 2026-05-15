import type { ComponentPublicInstance } from 'vue';
import { Post } from '@/modules/posts/interfaces/post.interface';

export interface PopularPostsSectionProps {
    posts: Post[];
    activePostId: number | null;
    isPlaying: boolean;
    likePendingPostIds: number[];
    isInitialLoading: boolean;
    isLoadingMore: boolean;
    errorMessage: string;
    canLoadMore: boolean;
    setLoadMoreTrigger?: (ref: Element | ComponentPublicInstance | null) => void;
}
