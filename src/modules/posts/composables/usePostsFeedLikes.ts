import { Ref, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';

export const usePostsFeedLikes = (posts: Ref<Post[]>) => {
    const authStore = useAuthStore();
    const postsStore = usePostsStore();
    const player = usePostPlayer();
    const router = useRouter();
    const likePendingPostIds = ref<number[]>([]);

    const applyLocalLikeState = (postId: number, isLiked: boolean, likesCount?: number): void => {
        posts.value = posts.value.map((post) => post.postId === postId
            ? {
                ...post,
                isLiked,
                likesCount: likesCount ?? Math.max(0, post.likesCount + (isLiked ? 1 : -1)),
            }
            : post);

        const updatedPost = posts.value.find((post) => post.postId === postId);

        if (updatedPost) {
            player.syncActivePost(updatedPost);
        } else if (player.activePost.value?.postId === postId) {
            player.syncActivePost({
                ...player.activePost.value,
                isLiked,
                likesCount: likesCount ?? Math.max(0, player.activePost.value.likesCount + (isLiked ? 1 : -1)),
            });
        }
    };

    const toggleLike = async (postId: number): Promise<void> => {
        if (!authStore.isAuthenticated) {
            await router.push({ name: AuthRouteNames.LOGIN });
            return;
        }

        const targetPost = posts.value.find((post) => post.postId === postId) ?? player.activePost.value;

        if (!targetPost || likePendingPostIds.value.includes(postId)) {
            return;
        }

        const nextIsLiked = !targetPost.isLiked;
        const previousIsLiked = targetPost.isLiked;
        const previousLikesCount = targetPost.likesCount;

        likePendingPostIds.value = [...likePendingPostIds.value, postId];
        applyLocalLikeState(postId, nextIsLiked, previousLikesCount);
        postsStore.applyPostLikeState(postId, nextIsLiked, previousLikesCount);

        try {
            const result = nextIsLiked
                ? await postsStore.likePost(postId)
                : await postsStore.unlikePost(postId);

            applyLocalLikeState(postId, nextIsLiked, result.likesCount);
            postsStore.applyPostLikeState(postId, nextIsLiked, result.likesCount);
        } catch (_error) {
            applyLocalLikeState(postId, previousIsLiked, previousLikesCount);
            postsStore.applyPostLikeState(postId, previousIsLiked, previousLikesCount);
        } finally {
            likePendingPostIds.value = likePendingPostIds.value.filter((pendingPostId) => pendingPostId !== postId);
        }
    };

    return {
        likePendingPostIds,
        toggleLike,
    };
};
