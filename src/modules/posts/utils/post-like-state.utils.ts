import { Post } from '@/modules/posts/interfaces/post.interface';

const LIKED_POST_IDS_STORAGE_KEY = 'eter:liked-post-ids';

const readLikedPostIds = (): Set<number> => {
    if (typeof window === 'undefined') {
        return new Set();
    }

    try {
        const rawIds = window.localStorage.getItem(LIKED_POST_IDS_STORAGE_KEY);

        if (!rawIds) {
            return new Set();
        }

        const parsedIds = JSON.parse(rawIds);

        if (!Array.isArray(parsedIds)) {
            return new Set();
        }

        return new Set(parsedIds.filter((postId): postId is number => Number.isInteger(postId) && postId > 0));
    } catch (_error) {
        return new Set();
    }
};

const writeLikedPostIds = (postIds: Set<number>): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(LIKED_POST_IDS_STORAGE_KEY, JSON.stringify([...postIds]));
};

export const rememberPostLikeState = (postId: number, isLiked: boolean): void => {
    const likedPostIds = readLikedPostIds();

    if (isLiked) {
        likedPostIds.add(postId);
    } else {
        likedPostIds.delete(postId);
    }

    writeLikedPostIds(likedPostIds);
};

export const applyRememberedPostLikeState = (post: Post): Post => {
    if (!readLikedPostIds().has(post.postId)) {
        return post;
    }

    return {
        ...post,
        isLiked: true,
    };
};
