import type { ProfileFollowListItem } from '@/modules/profile/interfaces/profile-follow-list-item.interface';

export interface PaginatedProfileFollowListResponse {
    items: ProfileFollowListItem[];
    total: number;
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
}
