import { computed, ref, watch, type Ref } from 'vue';
import type { Post } from '@/modules/posts/interfaces/post.interface';

type PostPlayerControls = {
    activePostId: Readonly<Ref<number | null>>;
    isPlaying: Readonly<Ref<boolean>>;
    playPost: (post: Post) => Promise<void>;
    togglePostPlayback: (post: Post) => Promise<void>;
    seekToPercent: (progressPercent: number) => Promise<void>;
};

type UsePostPageImmersiveModeOptions = {
    activePost: Readonly<Ref<Post | null>>;
    player: PostPlayerControls;
};

export const usePostPageImmersiveMode = ({
    activePost,
    player,
}: UsePostPageImmersiveModeOptions) => {
    const isImmersiveModeOpen = ref(false);

    const hasImmersiveMode = computed(() => !!activePost.value?.audioFileUrl
        && !!activePost.value?.text?.trim()
        && activePost.value.textSynchronization.length > 0);

    const openImmersiveMode = async (): Promise<void> => {
        if (!activePost.value || !hasImmersiveMode.value) {
            return;
        }

        isImmersiveModeOpen.value = true;

        if (player.activePostId.value !== activePost.value.postId || !player.isPlaying.value) {
            await player.playPost(activePost.value);
        }
    };

    const closeImmersiveMode = (): void => {
        isImmersiveModeOpen.value = false;
    };

    const toggleImmersivePlayback = async (): Promise<void> => {
        if (!activePost.value) {
            return;
        }

        await player.togglePostPlayback(activePost.value);
    };

    const seekImmersiveProgress = async (progressPercent: number): Promise<void> => {
        await player.seekToPercent(progressPercent);
    };

    watch(() => activePost.value?.postId, () => {
        isImmersiveModeOpen.value = false;
    });

    return {
        isImmersiveModeOpen,
        hasImmersiveMode,
        openImmersiveMode,
        closeImmersiveMode,
        toggleImmersivePlayback,
        seekImmersiveProgress,
    };
};
