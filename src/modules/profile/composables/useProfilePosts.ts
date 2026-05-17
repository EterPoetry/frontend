import {computed, ref, type ComputedRef, type Ref} from 'vue';
import {PostStatus} from '@/modules/posts/enums/post-status.enum';
import type {Post} from '@/modules/posts/interfaces/post.interface';
import type {
    UserPostsAuthorType,
    UserPostsSortBy,
    UserPostsSortOrder,
} from '@/modules/posts/interfaces/get-user-posts-query.interface';
import {PROFILE_POSTS_PAGE_LIMIT} from '@/modules/profile/constants/profile.constants';
import type {ProfileResponse} from '@/modules/profile/interfaces/profile-response.interface';
import type {PublicProfile} from '@/modules/profile/interfaces/public-profile.interface';
import {useAuthStore} from '@/modules/auth/auth.store';
import {usePostsStore} from '@/modules/posts/posts.store';
import {usePostPlayer} from '@/modules/posts/composables/usePostPlayer';
import {uk} from '@/shared/locales/uk';

type AuthStore = ReturnType<typeof useAuthStore>;
type PostsStore = ReturnType<typeof usePostsStore>;
type PostPlayer = ReturnType<typeof usePostPlayer>;

interface UseProfilePostsOptions {
    authStore: AuthStore;
    postsStore: PostsStore;
    player: PostPlayer;
    isOwnProfile: ComputedRef<boolean>;
    isUsernameRoute: ComputedRef<boolean>;
    routeUsername: ComputedRef<string | null>;
    currentProfile: ComputedRef<ProfileResponse | PublicProfile | null>;
}

interface UseProfilePostsResult {
    publishedSortBy: Ref<UserPostsSortBy>;
    publishedSortOrder: Ref<UserPostsSortOrder>;
    publishedAuthorType: Ref<UserPostsAuthorType | null>;
    publishedPosts: Ref<Post[]>;
    publishedTotal: Ref<number>;
    isPublishedLoading: Ref<boolean>;
    isPublishedLoadingMore: Ref<boolean>;
    publishedErrorMessage: Ref<string>;
    ownPosts: Ref<Post[]>;
    ownPostsTotal: Ref<number>;
    isDraftsLoading: Ref<boolean>;
    isDraftsLoadingMore: Ref<boolean>;
    draftsErrorMessage: Ref<string>;
    canLoadMorePublished: ComputedRef<boolean>;
    draftPosts: ComputedRef<Post[]>;
    canLoadMoreDrafts: ComputedRef<boolean>;
    activePublishedPostId: ComputedRef<number | null>;
    resetPublishedSortFilter: () => void;
    resetProfilePostsState: () => void;
    loadPublishedPosts: (append?: boolean, userIdOverride?: number, usernameOverride?: string) => Promise<void>;
    ensureDraftPostsVisible: () => Promise<void>;
    loadMoreDraftPosts: () => Promise<void>;
    handlePublishedActivate: (postId: number) => Promise<void>;
    setPublishedSort: (sortBy: UserPostsSortBy) => void;
    setPublishedAuthorType: (type: UserPostsAuthorType | null) => void;
}

export const useProfilePosts = ({
    authStore,
    postsStore,
    player,
    isOwnProfile,
    isUsernameRoute,
    routeUsername,
    currentProfile,
}: UseProfilePostsOptions): UseProfilePostsResult => {
    const publishedSortBy = ref<UserPostsSortBy>('createdAt');
    const publishedSortOrder = ref<UserPostsSortOrder>('desc');
    const publishedAuthorType = ref<UserPostsAuthorType | null>(null);
    const publishedPosts = ref<Post[]>([]);
    const publishedTotal = ref(0);
    const isPublishedLoading = ref(false);
    const isPublishedLoadingMore = ref(false);
    const publishedErrorMessage = ref('');
    const ownPosts = ref<Post[]>([]);
    const ownPostsTotal = ref(0);
    const isDraftsLoading = ref(false);
    const isDraftsLoadingMore = ref(false);
    const draftsErrorMessage = ref('');

    const canLoadMorePublished = computed(() => publishedPosts.value.length < publishedTotal.value);
    const draftPosts = computed(() => ownPosts.value.filter((post) => post.status === PostStatus.DRAFT));
    const canLoadMoreDrafts = computed(() => ownPosts.value.length < ownPostsTotal.value);
    const activePublishedPostId = computed(() => player.activePostId.value);

    const resetPublishedSortFilter = (): void => {
        publishedSortBy.value = 'createdAt';
        publishedSortOrder.value = 'desc';
        publishedAuthorType.value = null;
    };

    const resetProfilePostsState = (): void => {
        publishedPosts.value = [];
        publishedTotal.value = 0;
        publishedErrorMessage.value = '';
        ownPosts.value = [];
        ownPostsTotal.value = 0;
        draftsErrorMessage.value = '';
    };

    const loadPublishedPosts = async (
        append = false,
        userIdOverride?: number,
        usernameOverride?: string,
    ): Promise<void> => {
        const targetUsername = usernameOverride
            ?? (isUsernameRoute.value ? currentProfile.value?.username ?? routeUsername.value : null);
        const targetUserId = userIdOverride ?? currentProfile.value?.userId;

        if ((!targetUserId && !targetUsername) || (append && !canLoadMorePublished.value)) {
            return;
        }

        if (append) {
            isPublishedLoadingMore.value = true;
        } else {
            isPublishedLoading.value = true;
            publishedErrorMessage.value = '';
        }

        const query = {
            sortBy: publishedSortBy.value,
            sortOrder: publishedSortOrder.value,
            ...(publishedAuthorType.value ? {authorType: publishedAuthorType.value} : {}),
            offset: append ? publishedPosts.value.length : 0,
            limit: PROFILE_POSTS_PAGE_LIMIT,
        };

        try {
            const response = targetUsername
                ? await postsStore.getProfilePostsByUsername(targetUsername, query)
                : await postsStore.getProfilePosts(targetUserId!, query);

            publishedPosts.value = append
                ? [...publishedPosts.value, ...response.items]
                : response.items;
            publishedTotal.value = response.total;
        } catch (error) {
            publishedErrorMessage.value = uk.profile.posts.loadFailed;
        } finally {
            isPublishedLoading.value = false;
            isPublishedLoadingMore.value = false;
        }
    };

    const loadOwnPostsPage = async (append = false): Promise<void> => {
        if (!isOwnProfile.value || !authStore.isAuthenticated || (append && !canLoadMoreDrafts.value)) {
            return;
        }

        if (append) {
            isDraftsLoadingMore.value = true;
        } else {
            isDraftsLoading.value = true;
            draftsErrorMessage.value = '';
        }

        try {
            const response = await postsStore.getMyPosts({
                sortBy: 'updatedAt',
                sortOrder: 'desc',
                offset: append ? ownPosts.value.length : 0,
                limit: PROFILE_POSTS_PAGE_LIMIT,
            });

            ownPosts.value = append
                ? [...ownPosts.value, ...response.items]
                : response.items;
            ownPostsTotal.value = response.total;
        } catch (error) {
            draftsErrorMessage.value = uk.profile.posts.draftsLoadFailed;
        } finally {
            isDraftsLoading.value = false;
            isDraftsLoadingMore.value = false;
        }
    };

    const ensureDraftPostsVisible = async (): Promise<void> => {
        if (!isOwnProfile.value || isDraftsLoading.value || isDraftsLoadingMore.value) {
            return;
        }

        if (!ownPosts.value.length) {
            await loadOwnPostsPage(false);
        }

        while (!draftPosts.value.length && ownPosts.value.length < ownPostsTotal.value) {
            await loadOwnPostsPage(true);
        }
    };

    const loadMoreDraftPosts = async (): Promise<void> => {
        const previousDraftsCount = draftPosts.value.length;

        if (!ownPosts.value.length) {
            await ensureDraftPostsVisible();
            return;
        }

        while (draftPosts.value.length === previousDraftsCount && ownPosts.value.length < ownPostsTotal.value) {
            await loadOwnPostsPage(true);
        }
    };

    const handlePublishedActivate = async (postId: number): Promise<void> => {
        const targetPost = publishedPosts.value.find((post) => post.postId === postId);

        if (!targetPost || targetPost.status !== PostStatus.PUBLISHED) {
            return;
        }

        await player.togglePostPlayback(targetPost);
    };

    const setPublishedSort = (sortBy: UserPostsSortBy): void => {
        if (publishedSortBy.value === sortBy) {
            publishedSortOrder.value = publishedSortOrder.value === 'desc' ? 'asc' : 'desc';
        } else {
            publishedSortBy.value = sortBy;
            publishedSortOrder.value = 'desc';
        }

        publishedPosts.value = [];
        publishedTotal.value = 0;
        void loadPublishedPosts(false);
    };

    const setPublishedAuthorType = (type: UserPostsAuthorType | null): void => {
        publishedAuthorType.value = type;
        publishedPosts.value = [];
        publishedTotal.value = 0;
        void loadPublishedPosts(false);
    };

    return {
        publishedSortBy,
        publishedSortOrder,
        publishedAuthorType,
        publishedPosts,
        publishedTotal,
        isPublishedLoading,
        isPublishedLoadingMore,
        publishedErrorMessage,
        ownPosts,
        ownPostsTotal,
        isDraftsLoading,
        isDraftsLoadingMore,
        draftsErrorMessage,
        canLoadMorePublished,
        draftPosts,
        canLoadMoreDrafts,
        activePublishedPostId,
        resetPublishedSortFilter,
        resetProfilePostsState,
        loadPublishedPosts,
        ensureDraftPostsVisible,
        loadMoreDraftPosts,
        handlePublishedActivate,
        setPublishedSort,
        setPublishedAuthorType,
    };
};
