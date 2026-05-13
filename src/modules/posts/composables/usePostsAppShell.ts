import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { DEFAULT_FREE_DURATION_LIMIT_MINUTES } from '@/modules/posts/constants/post-limits.constants';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';

export const usePostsAppShell = () => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();
    const router = useRouter();

    const search = ref('');
    const isCreatePostModalOpen = ref(false);

    const isAuthenticated = computed(() => authStore.isAuthenticated);
    const durationLimitMinutes = computed(() => {
        const recordingConfig = postsStore.config?.recording;

        if (!recordingConfig) {
            return DEFAULT_FREE_DURATION_LIMIT_MINUTES;
        }

        return authStore.user?.isPremium
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

    return {
        authStore,
        durationLimitMinutes,
        handleCreateClick,
        handleModalClose,
        handlePostCreated,
        isAuthenticated,
        isCreatePostModalOpen,
        openLogin,
        openRegister,
        search,
    };
};
