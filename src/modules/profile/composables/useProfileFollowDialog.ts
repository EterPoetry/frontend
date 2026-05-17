import {computed, onBeforeUnmount, reactive, ref, watch, type ComputedRef, type Ref} from 'vue';
import {SEARCH_INPUT_DEBOUNCE_MS} from '@/shared/constants/ui.constants';
import {FOLLOW_LIST_PAGE_LIMIT} from '@/modules/profile/constants/profile.constants';
import type {PaginatedProfileFollowListResponse} from '@/modules/profile/interfaces/paginated-profile-follow-list-response.interface';
import type {ProfileFollowListItem} from '@/modules/profile/interfaces/profile-follow-list-item.interface';
import type {ProfileResponse} from '@/modules/profile/interfaces/profile-response.interface';
import type {PublicProfile} from '@/modules/profile/interfaces/public-profile.interface';
import {useProfileStore} from '@/modules/profile/profile.store';
import {uk} from '@/shared/locales/uk';

type ProfileStore = ReturnType<typeof useProfileStore>;
type FollowDialogKind = 'followers' | 'following' | null;

interface UseProfileFollowDialogOptions {
    profileStore: ProfileStore;
    isOwnProfile: ComputedRef<boolean>;
    currentProfile: ComputedRef<ProfileResponse | PublicProfile | null>;
    routeUserId: ComputedRef<number | null>;
}

interface UseProfileFollowDialogResult {
    followDialogKind: Ref<FollowDialogKind>;
    followSearch: Ref<string>;
    isFollowDialogLoading: Ref<boolean>;
    isFollowDialogLoadingMore: Ref<boolean>;
    followDialogErrorMessage: Ref<string>;
    followTogglePendingUserIds: Ref<number[]>;
    followDialogState: PaginatedProfileFollowListResponse;
    followDialogTitle: ComputedRef<string>;
    followDialogSubtitle: ComputedRef<string>;
    followDialogSearchPlaceholder: ComputedRef<string>;
    openFollowDialog: (kind: Exclude<FollowDialogKind, null>) => Promise<void>;
    closeFollowDialog: () => void;
    handleFollowSearchChange: (value: string) => void;
    toggleFollowListSubscription: (userId: number) => Promise<void>;
    loadFollowDialog: (append?: boolean) => Promise<void>;
}

export const useProfileFollowDialog = ({
    profileStore,
    isOwnProfile,
    currentProfile,
    routeUserId,
}: UseProfileFollowDialogOptions): UseProfileFollowDialogResult => {
    const followDialogKind = ref<FollowDialogKind>(null);
    const followSearch = ref('');
    const followQuery = ref('');
    const isFollowDialogLoading = ref(false);
    const isFollowDialogLoadingMore = ref(false);
    const followDialogErrorMessage = ref('');
    const followTogglePendingUserIds = ref<number[]>([]);
    let followSearchTimer: ReturnType<typeof setTimeout> | null = null;

    const followDialogState = reactive<PaginatedProfileFollowListResponse>({
        items: [],
        total: 0,
        limit: FOLLOW_LIST_PAGE_LIMIT,
        nextCursor: null,
        hasMore: false,
    });

    const followDialogTargetUserId = computed<number | 'me' | null>(() => {
        if (isOwnProfile.value) {
            return 'me';
        }

        return currentProfile.value?.userId ?? routeUserId.value ?? null;
    });

    const followDialogTitle = computed(() => followDialogKind.value === 'following'
        ? uk.profile.dialogs.followingTitle
        : uk.profile.dialogs.followersTitle);

    const followDialogSubtitle = computed(() => {
        const total = followDialogState.total;

        return `${total} ${followDialogKind.value === 'following'
            ? uk.profile.stats.following.toLowerCase()
            : uk.profile.stats.followers.toLowerCase()}`;
    });

    const followDialogSearchPlaceholder = computed(() => followDialogKind.value === 'following'
        ? uk.profile.dialogs.followingSearch
        : uk.profile.dialogs.followersSearch);

    const resetFollowDialogState = (): void => {
        followDialogState.items = [];
        followDialogState.total = 0;
        followDialogState.limit = FOLLOW_LIST_PAGE_LIMIT;
        followDialogState.nextCursor = null;
        followDialogState.hasMore = false;
    };

    const syncFollowDialogState = (response: PaginatedProfileFollowListResponse, append: boolean): void => {
        followDialogState.items = append
            ? [...followDialogState.items, ...response.items]
            : response.items;
        followDialogState.total = response.total;
        followDialogState.limit = response.limit;
        followDialogState.nextCursor = response.nextCursor;
        followDialogState.hasMore = response.hasMore;
    };

    const loadFollowDialog = async (append = false): Promise<void> => {
        if (!followDialogKind.value || !followDialogTargetUserId.value) {
            return;
        }

        if (append && !followDialogState.hasMore) {
            return;
        }

        const query = {
            search: followQuery.value.trim() || undefined,
            limit: FOLLOW_LIST_PAGE_LIMIT,
            cursor: append ? followDialogState.nextCursor || undefined : undefined,
        };

        if (append) {
            isFollowDialogLoadingMore.value = true;
        } else {
            isFollowDialogLoading.value = true;
            followDialogErrorMessage.value = '';
        }

        try {
            const response = followDialogKind.value === 'followers'
                ? await profileStore.getProfileFollowers(followDialogTargetUserId.value, query)
                : await profileStore.getProfileFollowing(followDialogTargetUserId.value, query);

            syncFollowDialogState(response, append);
        } catch (error) {
            followDialogErrorMessage.value = uk.common.errors.serverError;
        } finally {
            isFollowDialogLoading.value = false;
            isFollowDialogLoadingMore.value = false;
        }
    };

    const openFollowDialog = async (kind: Exclude<FollowDialogKind, null>): Promise<void> => {
        if (!followDialogTargetUserId.value) {
            return;
        }

        followDialogKind.value = kind;
        followSearch.value = '';
        followQuery.value = '';
        resetFollowDialogState();
        await loadFollowDialog();
    };

    const closeFollowDialog = (): void => {
        followDialogKind.value = null;
    };

    const handleFollowSearchChange = (value: string): void => {
        followSearch.value = value;

        if (followSearchTimer) {
            clearTimeout(followSearchTimer);
        }

        followSearchTimer = setTimeout(() => {
            followQuery.value = value;
            followSearchTimer = null;
        }, SEARCH_INPUT_DEBOUNCE_MS);
    };

    const toggleFollowListSubscription = async (userId: number): Promise<void> => {
        if (followTogglePendingUserIds.value.includes(userId)) {
            return;
        }

        const item = followDialogState.items.find((entry) => entry.userId === userId);

        if (!item) {
            return;
        }

        followTogglePendingUserIds.value = [...followTogglePendingUserIds.value, userId];

        try {
            const updatedProfile = item.isSubscribed
                ? await profileStore.unfollowUser(userId)
                : await profileStore.followUser(userId);

            followDialogState.items = followDialogState.items.map((entry): ProfileFollowListItem => entry.userId === userId
                ? {
                    ...entry,
                    isSubscribed: updatedProfile.isSubscribed,
                }
                : entry);
        } catch (error) {
            followDialogErrorMessage.value = uk.common.errors.serverError;
        } finally {
            followTogglePendingUserIds.value = followTogglePendingUserIds.value.filter((entry) => entry !== userId);
        }
    };

    watch(followQuery, () => {
        if (!followDialogKind.value) {
            return;
        }

        void loadFollowDialog();
    });

    onBeforeUnmount(() => {
        if (followSearchTimer) {
            clearTimeout(followSearchTimer);
        }
    });

    return {
        followDialogKind,
        followSearch,
        isFollowDialogLoading,
        isFollowDialogLoadingMore,
        followDialogErrorMessage,
        followTogglePendingUserIds,
        followDialogState,
        followDialogTitle,
        followDialogSubtitle,
        followDialogSearchPlaceholder,
        openFollowDialog,
        closeFollowDialog,
        handleFollowSearchChange,
        toggleFollowListSubscription,
        loadFollowDialog,
    };
};
