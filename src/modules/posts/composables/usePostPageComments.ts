import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import {
    COMMENTS_FOCUS_EVENT,
    COMMENTS_FOCUS_QUERY_TARGET,
    COMMENTS_LOAD_MORE_ROOT_MARGIN,
    COMMENTS_PAGE_LIMIT,
    REPLIES_PAGE_LIMIT,
} from '@/modules/posts/constants/post-comments.constants';
import { CommentSortOrder } from '@/modules/posts/enums/comment-sort-order.enum';
import type { PostComment } from '@/modules/posts/interfaces/post-comment.interface';
import type { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';
import type { BaseFieldHandle } from '@/shared/interfaces/base-field-handle.interface';
import { uk } from '@/shared/locales/uk';

type UsePostPageCommentsOptions = {
    activePost: Readonly<Ref<Post | null>>;
    routePostId: Readonly<Ref<number | null>>;
    isCommentsAvailable: Readonly<Ref<boolean>>;
    isOwnPost: Readonly<Ref<boolean>>;
    isLoadingPost: Readonly<Ref<boolean>>;
    isMobileViewport: Readonly<Ref<boolean>>;
    ensureAuthenticated: () => Promise<boolean>;
    syncPlayerPostState: () => void;
};

export const usePostPageComments = ({
    activePost,
    routePostId,
    isCommentsAvailable,
    isOwnPost,
    isLoadingPost,
    isMobileViewport,
    ensureAuthenticated,
    syncPlayerPostState,
}: UsePostPageCommentsOptions) => {
    const postsStore = usePostsStore();
    const authStore = useAuthStore();
    const route = useRoute();

    const isLoadingComments = ref(false);
    const isLoadingMoreComments = ref(false);
    const commentsSort = ref<CommentSortOrder>(CommentSortOrder.NEWEST);
    const pendingDeleteComment = ref<PostComment | null>(null);
    const isSubmittingComment = ref(false);
    const commentsErrorMessage = ref('');
    const rootCommentDraft = ref('');
    const replyDrafts = ref<Record<number, string>>({});
    const replyFormCommentIds = ref<number[]>([]);
    const expandedReplyCommentIds = ref<number[]>([]);
    const loadingReplyCommentIds = ref<number[]>([]);
    const likePendingCommentIds = ref<number[]>([]);
    const deletingCommentIds = ref<number[]>([]);
    const commentsSectionElement = ref<HTMLElement | null>(null);
    const loadMoreCommentsTrigger = ref<HTMLElement | null>(null);
    const rootCommentInputElement = ref<BaseFieldHandle | null>(null);
    const isCommentsFocusPending = ref(false);
    const isMobileCommentsSheetOpen = ref(false);
    let commentsObserver: IntersectionObserver | null = null;

    const openCommentsSheet = (): void => {
        isMobileCommentsSheetOpen.value = true;
    };

    const closeCommentsSheet = (): void => {
        isMobileCommentsSheetOpen.value = false;
    };

    const focusCommentsComposer = async (): Promise<void> => {
        if (!isCommentsAvailable.value) {
            return;
        }

        if (isMobileViewport.value) {
            openCommentsSheet();
        }

        for (let attempt = 0; attempt < 3; attempt += 1) {
            await nextTick();
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

            const commentInput = rootCommentInputElement.value;
            const commentInputElement = commentInput?.getControlElement() ?? null;

            if (!commentsSectionElement.value || !commentInput || !commentInputElement) {
                continue;
            }

            commentsSectionElement.value.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
            commentInput.focus();
            commentInput.setSelectionRange(
                rootCommentDraft.value.length,
                rootCommentDraft.value.length,
            );

            if (document.activeElement === commentInputElement) {
                return;
            }
        }
    };

    const resolvePendingCommentsFocus = async (): Promise<void> => {
        if (!isCommentsFocusPending.value) {
            return;
        }

        await focusCommentsComposer();
        isCommentsFocusPending.value = false;
    };

    const requestCommentsFocus = (): void => {
        isCommentsFocusPending.value = true;

        if (activePost.value && !isLoadingPost.value && !isLoadingComments.value) {
            void focusCommentsComposer().finally(() => {
                isCommentsFocusPending.value = false;
            });
        }
    };

    const handleCommentsFocusEvent = (event: Event): void => {
        const customEvent = event as CustomEvent<{ postId?: number }>;

        if (!customEvent.detail?.postId || customEvent.detail.postId !== activePost.value?.postId) {
            return;
        }

        requestCommentsFocus();
    };

    const formatCommentTime = (value?: string): string => {
        if (!value) {
            return '';
        }

        const timestamp = new Date(value).getTime();

        if (!Number.isFinite(timestamp)) {
            return '';
        }

        const diffMs = Math.max(0, Date.now() - timestamp);
        const diffMinutes = Math.floor(diffMs / 60_000);

        if (diffMinutes < 1) {
            return uk.posts.details.timeAgoNow;
        }

        if (diffMinutes < 60) {
            return uk.posts.details.timeAgoMinutes(diffMinutes);
        }

        const diffHours = Math.floor(diffMinutes / 60);

        if (diffHours < 24) {
            return uk.posts.details.timeAgoHours(diffHours);
        }

        const diffDays = Math.floor(diffHours / 24);

        return uk.posts.details.timeAgoDays(diffDays);
    };

    const canDeleteComment = (comment: PostComment): boolean => {
        const userId = authStore.user?.userId;

        return !!userId && (comment.author.userId === userId || activePost.value?.authorId === userId);
    };

    const loadComments = async (reset = true): Promise<void> => {
        if (!routePostId.value || !isCommentsAvailable.value) {
            postsStore.clearPostComments();
            return;
        }

        if (reset) {
            isLoadingComments.value = true;
            commentsErrorMessage.value = '';
        } else {
            if (isLoadingComments.value || isLoadingMoreComments.value || !postsStore.commentsHasMore) {
                return;
            }

            isLoadingMoreComments.value = true;
        }

        try {
            await postsStore.getPostComments(routePostId.value, {
                limit: COMMENTS_PAGE_LIMIT,
                sort: commentsSort.value,
                ...(reset ? {} : { cursor: postsStore.commentsNextCursor ?? undefined }),
            });
        } catch {
            commentsErrorMessage.value = uk.posts.details.commentsLoadFailed;
        } finally {
            if (reset) {
                isLoadingComments.value = false;
                return;
            }

            isLoadingMoreComments.value = false;
        }
    };

    const setupCommentsObserver = (): void => {
        commentsObserver?.disconnect();

        commentsObserver = new IntersectionObserver((entries) => {
            const [entry] = entries;

            if (!entry?.isIntersecting) {
                return;
            }

            void loadComments(false);
        }, {
            rootMargin: COMMENTS_LOAD_MORE_ROOT_MARGIN,
        });

        if (loadMoreCommentsTrigger.value) {
            commentsObserver.observe(loadMoreCommentsTrigger.value);
        }
    };

    const changeCommentsSort = (sort: CommentSortOrder): void => {
        if (commentsSort.value === sort) {
            return;
        }

        commentsSort.value = sort;
        postsStore.clearPostComments();
        void loadComments(true);
    };

    const getCommentReplies = (commentId: number): PostComment[] => postsStore.commentReplies[commentId] ?? [];
    const isReplyFormOpen = (commentId: number): boolean => replyFormCommentIds.value.includes(commentId);
    const isRepliesExpanded = (commentId: number): boolean => expandedReplyCommentIds.value.includes(commentId);
    const isRepliesLoading = (commentId: number): boolean => loadingReplyCommentIds.value.includes(commentId);
    const isCommentDeleting = (commentId: number): boolean => deletingCommentIds.value.includes(commentId);
    const isCommentLikePending = (commentId: number): boolean => likePendingCommentIds.value.includes(commentId);
    const hasRepliesLoaded = (commentId: number): boolean => Object.prototype.hasOwnProperty.call(postsStore.commentReplies, commentId);
    const isLikedByPostAuthor = (comment: PostComment): boolean => comment.isLikedByAuthor;

    const toggleCommentLike = async (comment: PostComment): Promise<void> => {
        if (isCommentLikePending(comment.commentId)) {
            return;
        }

        if (!await ensureAuthenticated()) {
            return;
        }

        const nextIsLiked = !comment.isLiked;
        const nextIsLikedByAuthor = isOwnPost.value ? nextIsLiked : undefined;

        likePendingCommentIds.value = [...likePendingCommentIds.value, comment.commentId];
        postsStore.applyCommentLikeState(comment.commentId, nextIsLiked, undefined, nextIsLikedByAuthor);

        try {
            const result = nextIsLiked
                ? await postsStore.likeComment(comment.commentId)
                : await postsStore.unlikeComment(comment.commentId);

            postsStore.applyCommentLikeState(comment.commentId, nextIsLiked, result.likesCount, nextIsLikedByAuthor);
        } catch {
            postsStore.applyCommentLikeState(comment.commentId, !nextIsLiked, undefined, isOwnPost.value ? !nextIsLiked : undefined);
        } finally {
            likePendingCommentIds.value = likePendingCommentIds.value.filter((pendingCommentId) => pendingCommentId !== comment.commentId);
        }
    };

    const submitComment = async (replyToCommentId?: number): Promise<void> => {
        if (!activePost.value || isSubmittingComment.value) {
            return;
        }

        if (!await ensureAuthenticated()) {
            return;
        }

        const isReply = Number.isInteger(replyToCommentId);
        const draft = isReply
            ? replyDrafts.value[replyToCommentId as number] ?? ''
            : rootCommentDraft.value;
        const commentText = draft.trim();

        if (!commentText) {
            return;
        }

        isSubmittingComment.value = true;

        try {
            await postsStore.createComment(activePost.value.postId, {
                commentText,
                ...(isReply ? { replyToCommentId } : {}),
            });

            if (isReply) {
                replyDrafts.value = {
                    ...replyDrafts.value,
                    [replyToCommentId as number]: '',
                };
                replyFormCommentIds.value = replyFormCommentIds.value.filter((commentId) => commentId !== replyToCommentId);

                if (!expandedReplyCommentIds.value.includes(replyToCommentId as number)) {
                    expandedReplyCommentIds.value = [...expandedReplyCommentIds.value, replyToCommentId as number];
                }
            } else {
                rootCommentDraft.value = '';
            }

            syncPlayerPostState();
        } catch {
            commentsErrorMessage.value = uk.common.errors.serverError;
        } finally {
            isSubmittingComment.value = false;
        }
    };

    const toggleReplyForm = (commentId: number): void => {
        if (replyFormCommentIds.value.includes(commentId)) {
            replyFormCommentIds.value = replyFormCommentIds.value.filter((id) => id !== commentId);
            return;
        }

        replyFormCommentIds.value = [...replyFormCommentIds.value, commentId];
    };

    const toggleReplies = async (comment: PostComment): Promise<void> => {
        if (!comment.repliesCount) {
            return;
        }

        if (isRepliesExpanded(comment.commentId)) {
            expandedReplyCommentIds.value = expandedReplyCommentIds.value.filter((id) => id !== comment.commentId);
            return;
        }

        expandedReplyCommentIds.value = [...expandedReplyCommentIds.value, comment.commentId];

        if (hasRepliesLoaded(comment.commentId) || isRepliesLoading(comment.commentId)) {
            return;
        }

        loadingReplyCommentIds.value = [...loadingReplyCommentIds.value, comment.commentId];

        try {
            await postsStore.getCommentReplies(comment.commentId, {
                limit: REPLIES_PAGE_LIMIT,
            });
        } catch {
            commentsErrorMessage.value = uk.posts.details.commentsLoadFailed;
        } finally {
            loadingReplyCommentIds.value = loadingReplyCommentIds.value.filter((id) => id !== comment.commentId);
        }
    };

    const loadMoreReplies = async (commentId: number): Promise<void> => {
        if (!postsStore.commentRepliesHasMore[commentId] || isRepliesLoading(commentId)) {
            return;
        }

        loadingReplyCommentIds.value = [...loadingReplyCommentIds.value, commentId];

        try {
            await postsStore.getCommentReplies(commentId, {
                limit: REPLIES_PAGE_LIMIT,
                cursor: postsStore.commentRepliesNextCursor[commentId] ?? undefined,
            });
        } catch {
            commentsErrorMessage.value = uk.posts.details.commentsLoadFailed;
        } finally {
            loadingReplyCommentIds.value = loadingReplyCommentIds.value.filter((id) => id !== commentId);
        }
    };

    const deleteComment = async (comment: PostComment): Promise<void> => {
        if (isCommentDeleting(comment.commentId)) {
            return;
        }

        deletingCommentIds.value = [...deletingCommentIds.value, comment.commentId];

        try {
            await postsStore.deleteComment(comment.commentId);
            syncPlayerPostState();
        } catch {
            commentsErrorMessage.value = uk.common.errors.serverError;
        } finally {
            deletingCommentIds.value = deletingCommentIds.value.filter((commentId) => commentId !== comment.commentId);
        }
    };

    const requestDeleteComment = (comment: PostComment): void => {
        if (isCommentDeleting(comment.commentId)) {
            return;
        }

        pendingDeleteComment.value = comment;
    };

    const closeDeleteCommentDialog = (): void => {
        pendingDeleteComment.value = null;
    };

    const confirmDeleteComment = async (): Promise<void> => {
        const comment = pendingDeleteComment.value;

        if (!comment) {
            return;
        }

        pendingDeleteComment.value = null;
        await deleteComment(comment);
    };

    watch(
        [() => route.query.focus, () => route.query.focusToken],
        ([focusTarget]) => {
            if (focusTarget !== COMMENTS_FOCUS_QUERY_TARGET) {
                return;
            }

            requestCommentsFocus();
        },
        { immediate: true },
    );

    watch(isMobileViewport, (isMobile) => {
        if (!isMobile) {
            isMobileCommentsSheetOpen.value = false;
        }
    });

    watch(loadMoreCommentsTrigger, () => {
        setupCommentsObserver();
    });

    onMounted(() => {
        window.addEventListener(COMMENTS_FOCUS_EVENT, handleCommentsFocusEvent as EventListener);
        setupCommentsObserver();
    });

    onBeforeUnmount(() => {
        window.removeEventListener(COMMENTS_FOCUS_EVENT, handleCommentsFocusEvent as EventListener);
        commentsObserver?.disconnect();
    });

    return {
        isLoadingComments,
        isLoadingMoreComments,
        commentsSort,
        pendingDeleteComment,
        isSubmittingComment,
        commentsErrorMessage,
        rootCommentDraft,
        replyDrafts,
        replyFormCommentIds,
        expandedReplyCommentIds,
        loadingReplyCommentIds,
        likePendingCommentIds,
        deletingCommentIds,
        commentsSectionElement,
        loadMoreCommentsTrigger,
        rootCommentInputElement,
        isCommentsFocusPending,
        isMobileCommentsSheetOpen,
        openCommentsSheet,
        closeCommentsSheet,
        focusCommentsComposer,
        resolvePendingCommentsFocus,
        formatCommentTime,
        canDeleteComment,
        loadComments,
        changeCommentsSort,
        getCommentReplies,
        isReplyFormOpen,
        isRepliesExpanded,
        isRepliesLoading,
        isCommentDeleting,
        isCommentLikePending,
        isLikedByPostAuthor,
        toggleCommentLike,
        submitComment,
        toggleReplyForm,
        toggleReplies,
        loadMoreReplies,
        requestDeleteComment,
        closeDeleteCommentDialog,
        confirmDeleteComment,
    };
};
