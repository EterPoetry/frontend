import { Ref, ref, unref, type MaybeRef } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';

export const usePostsFeedLikes = (
    posts: Ref<Post[]>,
    options: {
        removeFromFeedOnUnlike?: MaybeRef<boolean | undefined>;
    } = {},
) => {
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
        const shouldRemoveFromFeed = unref(options.removeFromFeedOnUnlike) && !nextIsLiked;
        const likedFeedIndex = !nextIsLiked
            ? postsStore.likedPosts.findIndex((post) => post.postId === postId)
            : -1;
        const likedFeedSnapshot = likedFeedIndex >= 0
            ? {
                post: postsStore.likedPosts[likedFeedIndex],
                index: likedFeedIndex,
            }
            : null;
        const removedLikedPost = shouldRemoveFromFeed
            ? postsStore.removePostFromLikedFeed(postId)
            : null;

        likePendingPostIds.value = [...likePendingPostIds.value, postId];
        if (shouldRemoveFromFeed) {
            posts.value = posts.value.filter((post) => post.postId !== postId);

            if (player.activePost.value?.postId === postId) {
                player.syncActivePost({
                    ...player.activePost.value,
                    isLiked: nextIsLiked,
                    likesCount: previousLikesCount,
                });
            }
        } else {
            applyLocalLikeState(postId, nextIsLiked, previousLikesCount);
        }
        postsStore.applyPostLikeState(postId, nextIsLiked, previousLikesCount);

        try {
            const result = nextIsLiked
                ? await postsStore.likePost(postId)
                : await postsStore.unlikePost(postId);

            if (!shouldRemoveFromFeed) {
                applyLocalLikeState(postId, nextIsLiked, result.likesCount);
            } else if (player.activePost.value?.postId === postId) {
                player.syncActivePost({
                    ...player.activePost.value,
                    isLiked: nextIsLiked,
                    likesCount: result.likesCount,
                });
            }
            postsStore.applyPostLikeState(postId, nextIsLiked, result.likesCount);
        } catch (_error) {
            if (removedLikedPost) {
                postsStore.restorePostToLikedFeed(removedLikedPost.post, removedLikedPost.index);
                posts.value = postsStore.likedPosts;

                if (player.activePost.value?.postId === postId) {
                    player.syncActivePost({
                        ...player.activePost.value,
                        isLiked: previousIsLiked,
                        likesCount: previousLikesCount,
                    });
                }
            } else if (likedFeedSnapshot) {
                postsStore.restorePostToLikedFeed(likedFeedSnapshot.post, likedFeedSnapshot.index);
                applyLocalLikeState(postId, previousIsLiked, previousLikesCount);
            } else {
                applyLocalLikeState(postId, previousIsLiked, previousLikesCount);
            }
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
