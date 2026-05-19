import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { DEFAULT_FREE_DURATION_LIMIT_MINUTES } from '@/modules/posts/constants/post-limits.constants';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';

const DEFAULT_SORT_BY = 'newest';

const normalizeSortBy = (value: unknown): string => {
    if (value === 'oldest' || value === 'popular' || value === DEFAULT_SORT_BY) {
        return value;
    }

    return DEFAULT_SORT_BY;
};

const normalizeCategoryId = (value: unknown): number | null => {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    const parsed = Number.parseInt(value, 10);

    return Number.isFinite(parsed) ? parsed : null;
};

export const usePostsAppShell = () => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();
    const route = useRoute();
    const router = useRouter();

    const search = ref(typeof route.query.search === 'string' ? route.query.search : '');
    const sortBy = ref(normalizeSortBy(route.query.sortBy));
    const categoryId = ref<number | null>(normalizeCategoryId(route.query.categoryId));
    const isCreatePostModalOpen = ref(false);

    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const durationLimitMinutes = computed(() => {
        const recordingConfig = postsStore.config?.recording;

        if (!recordingConfig) {
            return DEFAULT_FREE_DURATION_LIMIT_MINUTES;
        }

        return authStore.isPremium
            ? recordingConfig.premiumDurationLimitMinutes
            : recordingConfig.freeDurationLimitMinutes;
    });

    const openRegister = async (): Promise<void> => {
        await router.push({ name: AuthRouteNames.REGISTER });
    };

    const openLogin = async (): Promise<void> => {
        await router.push({ name: AuthRouteNames.LOGIN });
    };

    const handleCreateClick = (): void => {
        if (!isAuthenticated.value) {
            void openRegister();
            return;
        }

        isCreatePostModalOpen.value = true;
    };

    const handleModalClose = (): void => {
        isCreatePostModalOpen.value = false;
    };

    const handlePostCreated = (post: Post): void => {
        isCreatePostModalOpen.value = false;
        void router.push({
            name: PostRouteNames.EDIT_POST,
            params: { postId: post.postId },
        });
    };

    onMounted(async () => {
        try {
            await postsStore.getConfig();
        } catch (_error) {
            // Fall back to the backend default shown in the UI when config is temporarily unavailable.
        }
    });

    watch(
        () => route.query,
        (query) => {
            const nextSearch = typeof query.search === 'string' ? query.search : '';
            const nextSortBy = normalizeSortBy(query.sortBy);
            const nextCategoryId = normalizeCategoryId(query.categoryId);

            if (search.value !== nextSearch) {
                search.value = nextSearch;
            }

            if (sortBy.value !== nextSortBy) {
                sortBy.value = nextSortBy;
            }

            if (categoryId.value !== nextCategoryId) {
                categoryId.value = nextCategoryId;
            }
        },
    );

    return {
        authStore,
        categoryId,
        durationLimitMinutes,
        handleCreateClick,
        handleModalClose,
        handlePostCreated,
        isAuthenticated,
        isCreatePostModalOpen,
        openLogin,
        openRegister,
        search,
        sortBy,
    };
};
