<script setup lang="ts">
import { isAxiosError } from 'axios';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { useProfileStore } from '@/modules/profile/profile.store';
import heartIconUrl from '@/shared/assets/icons/ui/heart.svg';
import heartActiveIconUrl from '@/shared/assets/icons/ui/heart-active.svg';
import commentIconUrl from '@/shared/assets/icons/ui/comment.svg';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import playsIconUrl from '@/shared/assets/icons/ui/plays.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import { CommentSortOrder } from '@/modules/posts/enums/comment-sort-order.enum';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostComment } from '@/modules/posts/interfaces/post-comment.interface';
import { PostTextSynchronizationItem } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';
import { formatPostDuration, formatPostTag } from '@/modules/posts/utils/post-formatting.utils';
import { getAuthorInitial } from '@/modules/posts/utils/post-author.utils';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import BaseBottomSheet from '@/shared/components/BaseBottomSheet/BaseBottomSheet.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { uk } from '@/shared/locales/uk';
import { formatCompactNumber } from '@/shared/utils/number.utils';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { SharedRouteNames } from '@/shared/enums/shared-route-names.enum';
import { BaseFieldHandle } from '@/shared/interfaces/base-field-handle.interface';
import { MOBILE_BREAKPOINT_PX } from '@/shared/constants/breakpoints.constants';
import { COMMENTS_PAGE_LIMIT, REPLIES_PAGE_LIMIT, COMMENTS_FOCUS_EVENT, COMMENTS_FOCUS_QUERY_TARGET } from '@/modules/posts/constants/post-comments.constants';
import './PostPage.css';

const postsStore = usePostsStore();
const authStore = useAuthStore();
const profileStore = useProfileStore();
const player = usePostPlayer();
const route = useRoute();
const router = useRouter();

const {
    durationLimitMinutes,
    handleCreateClick,
    handleModalClose,
    handlePostCreated,
    isAuthenticated,
    isCreatePostModalOpen,
    openLogin,
    openRegister,
    search,
} = usePostsAppShell();

const isLoadingPost = ref(false);
const isLoadingComments = ref(false);
const commentsSort = ref<CommentSortOrder>(CommentSortOrder.NEWEST);
const isDeletingPost = ref(false);
const isDeletePostDialogOpen = ref(false);
const pendingDeleteComment = ref<PostComment | null>(null);
const isSubmittingComment = ref(false);
const postErrorMessage = ref('');
const commentsErrorMessage = ref('');
const rootCommentDraft = ref('');
const replyDrafts = ref<Record<number, string>>({});
const replyFormCommentIds = ref<number[]>([]);
const expandedReplyCommentIds = ref<number[]>([]);
const loadingReplyCommentIds = ref<number[]>([]);
const likePendingPostIds = ref<number[]>([]);
const likePendingCommentIds = ref<number[]>([]);
const deletingCommentIds = ref<number[]>([]);
const isProfileLoading = ref(false);
const isFollowPending = ref(false);
const lineElements: Record<number, HTMLElement | null> = {};
const commentsSectionElement = ref<HTMLElement | null>(null);
const rootCommentInputElement = ref<BaseFieldHandle | null>(null);
const isCommentsFocusPending = ref(false);
const isMobileCommentsSheetOpen = ref(false);
const isMobileViewport = ref(false);
let activePostRequestId = 0;
let activeProfileRequestId = 0;

const routePostId = computed<number | null>(() => {
    const rawPostId = route.params.postId;
    const normalizedPostId = Array.isArray(rawPostId) ? rawPostId[0] : rawPostId;

    if (!normalizedPostId) {
        return null;
    }

    const parsedPostId = Number(normalizedPostId);

    return Number.isInteger(parsedPostId) && parsedPostId > 0 ? parsedPostId : null;
});

const activePost = computed(() => routePostId.value && postsStore.currentPost?.postId === routePostId.value
    ? postsStore.currentPost
    : null);

const isOwnPost = computed(() => {
    const userId = authStore.user?.userId;

    return !!userId && userId === activePost.value?.authorId;
});

const isPublishedPost = computed(() => activePost.value?.status === PostStatus.PUBLISHED);
const isCommentsAvailable = computed(() => !!activePost.value && isPublishedPost.value);
const authorProfile = computed(() => {
    const authorUserId = activePost.value?.author.userId;

    return authorUserId ? profileStore.getProfileById(authorUserId) : null;
});
const isAuthorSubscribed = computed(() => authorProfile.value?.isSubscribed ?? false);
const textLines = computed(() => (activePost.value?.text ?? '').split('\n'));
const formattedPublishedDate = computed(() => {
    const sourceDate = activePost.value?.createdAt;

    if (!sourceDate) {
        return '';
    }

    const parsedDate = new Date(sourceDate);

    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('uk-UA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(parsedDate);
});
const synchronizationMap = computed<Map<number, PostTextSynchronizationItem>>(() => new Map(
    (activePost.value?.textSynchronization ?? []).map((item) => [item.lineIndex, item]),
));
const canManageSynchronization = computed(() => !!activePost.value
    && isOwnPost.value
    && !!authStore.user?.isPremium
    && activePost.value.status !== PostStatus.PROCESSING
    && !!activePost.value.text?.trim());

const activeLineIndex = computed<number | null>(() => {
    if (!activePost.value || player.activePostId.value !== activePost.value.postId) {
        return null;
    }

    const synchronization = activePost.value.textSynchronization;

    if (!synchronization.length) {
        return null;
    }

    const currentMomentMs = Math.floor(player.currentTimeSeconds.value * 1000);
    let matchedLineIndex: number | null = null;

    for (const item of synchronization) {
        if (item.audioStartMomentMs <= currentMomentMs) {
            matchedLineIndex = item.lineIndex;
            continue;
        }

        break;
    }

    return matchedLineIndex;
});

const isPostLikePending = computed(() => activePost.value
    ? likePendingPostIds.value.includes(activePost.value.postId)
    : false);

const comments = computed(() => postsStore.comments);
const displayedCommentsCount = computed(() => {
    const postCommentsCount = activePost.value?.commentsCount ?? 0;

    if (!isCommentsAvailable.value) {
        return postCommentsCount;
    }

    return Math.max(postCommentsCount, postsStore.commentsTotal);
});

const getCommentReplies = (commentId: number): PostComment[] => postsStore.commentReplies[commentId] ?? [];
const isReplyFormOpen = (commentId: number): boolean => replyFormCommentIds.value.includes(commentId);
const isRepliesExpanded = (commentId: number): boolean => expandedReplyCommentIds.value.includes(commentId);
const isRepliesLoading = (commentId: number): boolean => loadingReplyCommentIds.value.includes(commentId);
const isCommentDeleting = (commentId: number): boolean => deletingCommentIds.value.includes(commentId);
const isCommentLikePending = (commentId: number): boolean => likePendingCommentIds.value.includes(commentId);
const hasRepliesLoaded = (commentId: number): boolean => Object.prototype.hasOwnProperty.call(postsStore.commentReplies, commentId);
const isLikedByPostAuthor = (comment: PostComment): boolean => comment.isLikedByAuthor;
const canLoadAuthenticatedPostState = computed(() => authStore.isInitialized || !authStore.token);

const syncMobileViewport = (): void => {
    isMobileViewport.value = window.innerWidth <= MOBILE_BREAKPOINT_PX;
};

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
        return 'щойно';
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} хв тому`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return `${diffHours} год тому`;
    }

    const diffDays = Math.floor(diffHours / 24);

    return `${diffDays} дн тому`;
};

const canDeleteComment = (comment: PostComment): boolean => {
    const userId = authStore.user?.userId;

    return !!userId && (comment.author.userId === userId || activePost.value?.authorId === userId);
};

const setLineElement = (lineIndex: number, element: unknown): void => {
    lineElements[lineIndex] = element instanceof HTMLElement ? element : null;
};

const syncPlayerPostState = (): void => {
    if (activePost.value) {
        player.syncActivePost(activePost.value);
    }
};

const syncSpecificPostToPlayer = (postId: number, isLiked: boolean, likesCount?: number): void => {
    const playerPost = player.activePost.value;

    if (!playerPost || playerPost.postId !== postId) {
        return;
    }

    player.syncActivePost({
        ...playerPost,
        isLiked,
        likesCount: likesCount ?? Math.max(0, playerPost.likesCount + (isLiked ? 1 : -1)),
    });
};

const ensureAuthenticated = async (): Promise<boolean> => {
    if (authStore.isAuthenticated) {
        return true;
    }

    await router.push({ name: AuthRouteNames.LOGIN });

    return false;
};

const loadAuthorProfile = async (userId: number): Promise<void> => {
    const requestId = ++activeProfileRequestId;

    isProfileLoading.value = true;

    try {
        await profileStore.getPublicProfile(userId);
    } catch (error) {
        if (requestId !== activeProfileRequestId) {
            return;
        }

        postErrorMessage.value = getApiErrorMessage(error) || uk.posts.details.profileLoadFailed;
    } finally {
        if (requestId === activeProfileRequestId) {
            isProfileLoading.value = false;
        }
    }
};

const loadComments = async (reset = true): Promise<void> => {
    if (!routePostId.value || !isCommentsAvailable.value) {
        postsStore.clearPostComments();
        return;
    }

    if (reset) {
        isLoadingComments.value = true;
        commentsErrorMessage.value = '';
    }

    try {
        await postsStore.getPostComments(routePostId.value, {
            limit: COMMENTS_PAGE_LIMIT,
            sort: commentsSort.value,
            ...(reset ? {} : { cursor: postsStore.commentsNextCursor ?? undefined }),
        });
    } catch (error) {
        commentsErrorMessage.value = getApiErrorMessage(error) || uk.posts.details.commentsLoadFailed;
    } finally {
        isLoadingComments.value = false;
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

const loadPost = async (postId: number): Promise<void> => {
    if (!canLoadAuthenticatedPostState.value) {
        return;
    }

    const requestId = ++activePostRequestId;

    isLoadingPost.value = true;
    postErrorMessage.value = '';
    commentsErrorMessage.value = '';
    commentsSort.value = CommentSortOrder.NEWEST;
    postsStore.clearPostComments();
    replyFormCommentIds.value = [];
    expandedReplyCommentIds.value = [];
    loadingReplyCommentIds.value = [];

    try {
        const post = await postsStore.fetchPost(postId);

        if (requestId !== activePostRequestId) {
            return;
        }

        postsStore.currentPost = post;
        syncPlayerPostState();
        await loadAuthorProfile(post.author.userId);
        await loadComments(true);

        if (requestId !== activePostRequestId) {
            return;
        }

        if (isCommentsFocusPending.value) {
            await focusCommentsComposer();
            isCommentsFocusPending.value = false;
        }
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
            await router.replace({ name: SharedRouteNames.NOT_FOUND });
            return;
        }

        postErrorMessage.value = getApiErrorMessage(error) || uk.common.errors.serverError;
    } finally {
        if (requestId === activePostRequestId) {
            isLoadingPost.value = false;
        }
    }
};

const togglePlayback = async (): Promise<void> => {
    if (!activePost.value?.audioFileUrl) {
        return;
    }

    try {
        const freshPost = await postsStore.getPost(activePost.value.postId);

        if (!freshPost.audioFileUrl) {
            return;
        }

        await player.togglePostPlayback(freshPost);
    } catch (_error) {
        await player.togglePostPlayback(activePost.value);
    }
};

const togglePostLike = async (requestedPostId?: number): Promise<void> => {
    const targetPost = requestedPostId
        ? (
            activePost.value?.postId === requestedPostId
                ? activePost.value
                : player.activePost.value?.postId === requestedPostId
                    ? player.activePost.value
                    : null
        )
        : activePost.value;

    if (!targetPost || likePendingPostIds.value.includes(targetPost.postId)) {
        return;
    }

    if (!await ensureAuthenticated()) {
        return;
    }

    const postId = targetPost.postId;
    const nextIsLiked = !targetPost.isLiked;
    const previousIsLiked = targetPost.isLiked;
    const previousLikesCount = targetPost.likesCount;
    const syncCurrentLikeState = (isLiked: boolean, likesCount?: number): void => {
        if (postsStore.currentPost?.postId === postId) {
            player.syncActivePost(postsStore.currentPost);
            return;
        }

        syncSpecificPostToPlayer(postId, isLiked, likesCount);
    };

    likePendingPostIds.value = [...likePendingPostIds.value, postId];
    postsStore.applyPostLikeState(postId, nextIsLiked, previousLikesCount);
    syncCurrentLikeState(nextIsLiked, previousLikesCount);

    try {
        const result = nextIsLiked
            ? await postsStore.likePost(postId)
            : await postsStore.unlikePost(postId);

        postsStore.applyPostLikeState(postId, nextIsLiked, result.likesCount);
        syncCurrentLikeState(nextIsLiked, result.likesCount);
    } catch (_error) {
        postsStore.applyPostLikeState(postId, previousIsLiked, previousLikesCount);
        syncCurrentLikeState(previousIsLiked, previousLikesCount);
    } finally {
        likePendingPostIds.value = likePendingPostIds.value.filter((pendingPostId) => pendingPostId !== postId);
    }
};

const toggleAuthorFollow = async (): Promise<void> => {
    const authorUserId = activePost.value?.author.userId;

    if (!authorUserId || isOwnPost.value || isFollowPending.value || isProfileLoading.value) {
        return;
    }

    if (!await ensureAuthenticated()) {
        return;
    }

    const currentProfile = profileStore.getProfileById(authorUserId);

    if (!currentProfile) {
        await loadAuthorProfile(authorUserId);
    }

    const nextProfile = profileStore.getProfileById(authorUserId);

    if (!nextProfile) {
        return;
    }

    const nextIsSubscribed = !nextProfile.isSubscribed;
    const previousIsSubscribed = nextProfile.isSubscribed;
    const previousFollowersCount = nextProfile.followersCount;

    isFollowPending.value = true;
    postErrorMessage.value = '';
    profileStore.applyProfileSubscriptionState(authorUserId, nextIsSubscribed, previousFollowersCount);

    try {
        const updatedProfile = nextIsSubscribed
            ? await profileStore.followUser(authorUserId)
            : await profileStore.unfollowUser(authorUserId);

        profileStore.applyProfileSubscriptionState(
            authorUserId,
            updatedProfile.isSubscribed,
            updatedProfile.followersCount,
        );
    } catch (error) {
        profileStore.applyProfileSubscriptionState(
            authorUserId,
            previousIsSubscribed,
            previousFollowersCount,
        );
        postErrorMessage.value = getApiErrorMessage(error) || uk.posts.details.followActionFailed;
    } finally {
        isFollowPending.value = false;
    }
};

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
    } catch (_error) {
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
    } catch (error) {
        commentsErrorMessage.value = getApiErrorMessage(error) || uk.common.errors.serverError;
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
    } catch (error) {
        commentsErrorMessage.value = getApiErrorMessage(error) || uk.posts.details.commentsLoadFailed;
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
    } catch (error) {
        commentsErrorMessage.value = getApiErrorMessage(error) || uk.posts.details.commentsLoadFailed;
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
    } catch (error) {
        commentsErrorMessage.value = getApiErrorMessage(error) || uk.common.errors.serverError;
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

const deletePost = async (): Promise<void> => {
    if (!activePost.value || isDeletingPost.value) {
        return;
    }

    isDeletingPost.value = true;

    try {
        const isDeleted = await postsStore.deletePost(activePost.value.postId);

        if (isDeleted) {
            await router.replace({ name: PostRouteNames.HOME });
            return;
        }
    } catch (error) {
        postErrorMessage.value = getApiErrorMessage(error) || uk.common.errors.serverError;
    } finally {
        isDeletingPost.value = false;
        isDeletePostDialogOpen.value = false;
    }
};

const openSynchronizationManager = async (): Promise<void> => {
    if (!activePost.value) {
        return;
    }

    await router.push({
        name: PostRouteNames.EDIT_POST,
        params: { postId: activePost.value.postId },
    });
};

const jumpToLine = async (lineIndex: number): Promise<void> => {
    if (!activePost.value?.audioFileUrl) {
        return;
    }

    const synchronizationItem = synchronizationMap.value.get(lineIndex);

    if (!synchronizationItem) {
        return;
    }

    const post = activePost.value;

    await player.playPost(post);

    if (!post.audioDurationSeconds) {
        return;
    }

    const seekPercent = (synchronizationItem.audioStartMomentMs / (post.audioDurationSeconds * 1000)) * 100;
    await player.seekToPercent(seekPercent);
};

watch(routePostId, (postId) => {
    if (!postId) {
        postErrorMessage.value = uk.common.errors.serverError;
        return;
    }

    void loadPost(postId);
}, { immediate: true });

watch(
    [() => authStore.isInitialized, () => authStore.token, routePostId],
    ([isInitialized, token], [prevIsInitialized, prevToken]) => {
        if (!isInitialized || !routePostId.value || (prevIsInitialized === isInitialized && prevToken === token)) {
            return;
        }

        void loadPost(routePostId.value);
    },
);

watch(activeLineIndex, (lineIndex) => {
    if (lineIndex === null) {
        return;
    }

    const element = lineElements[lineIndex];

    element?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
    });
});

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

onMounted(() => {
    syncMobileViewport();
    window.addEventListener('resize', syncMobileViewport);
    window.addEventListener(COMMENTS_FOCUS_EVENT, handleCommentsFocusEvent as EventListener);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', syncMobileViewport);
    window.removeEventListener(COMMENTS_FOCUS_EVENT, handleCommentsFocusEvent as EventListener);
    document.body.style.overflow = '';
});

watch(isMobileViewport, (isMobile) => {
    if (!isMobile) {
        isMobileCommentsSheetOpen.value = false;
    }
});

watch(isMobileCommentsSheetOpen, (isOpen) => {
    document.body.style.overflow = isOpen && isMobileViewport.value ? 'hidden' : '';
});
</script>

<template>
  <AppShell
      v-model:search="search"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="likePendingPostIds"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
      @like-toggle="togglePostLike"
  >
    <div class="post-page">
      <ErrorAlert v-if="postErrorMessage" :message="postErrorMessage" />

      <div v-else-if="isLoadingPost && !activePost" class="post-page__state">
        {{ uk.common.labels.loading }}
      </div>

      <div v-else-if="activePost" class="post-page__layout">
        <section class="post-page__column post-page__column--main">
          <article class="post-page__card post-page__card--summary">
            <div class="post-page__summary-head">
              <div class="post-page__summary-copy">
                <h1 class="post-page__title">{{ activePost.title || uk.posts.details.untitled }}</h1>

                <div class="post-page__meta-row">
                  <span v-if="activePost.originAuthorName" class="post-page__origin-author">
                    {{ activePost.originAuthorName }}
                  </span>

                  <template v-if="activePost.originAuthorName">
                    <span class="post-page__dot" aria-hidden="true" />
                  </template>

                  <span class="post-page__author">
                    <img
                        v-if="activePost.author.photo"
                        :src="activePost.author.photo"
                        :alt="activePost.author.name"
                        class="post-page__author-photo"
                    />
                    <span v-else class="post-page__author-fallback">
                      {{ getAuthorInitial(activePost.author.name) }}
                    </span>

                    <span class="post-page__author-name">{{ activePost.author.name }}</span>
                  </span>

                  <span class="post-page__dot" aria-hidden="true" />

                  <span class="post-page__duration">{{ formatPostDuration(activePost.audioDurationSeconds) }}</span>

                  <template v-if="formattedPublishedDate">
                    <span class="post-page__dot" aria-hidden="true" />
                    <span class="post-page__published-date">{{ formattedPublishedDate }}</span>
                  </template>
                </div>

                <div class="post-page__summary-actions">
                  <button
                      v-if="!isOwnPost"
                      type="button"
                      class="post-page__action-btn post-page__action-btn--primary"
                      :class="{ 'post-page__action-btn--secondary': isAuthorSubscribed }"
                      :disabled="isFollowPending || isProfileLoading"
                      @click="toggleAuthorFollow"
                  >
                    {{ isAuthorSubscribed ? uk.posts.details.unfollow : uk.posts.details.follow }}
                  </button>

                  <template v-else>
                    <button
                        type="button"
                        class="post-page__action-btn post-page__action-btn--primary"
                        @click="openSynchronizationManager"
                    >
                      {{ uk.posts.details.edit }}
                    </button>

                    <button
                        type="button"
                        class="post-page__action-btn post-page__action-btn--danger"
                        :disabled="isDeletingPost"
                        @click="isDeletePostDialogOpen = true"
                    >
                      {{ uk.posts.details.delete }}
                    </button>
                  </template>
                </div>

                <div
                    class="post-page__tags"
                    :class="{ 'post-page__tags--empty': !activePost.categories.length }"
                >
                  <span
                      v-for="category in activePost.categories"
                      :key="category.categoryId"
                      class="post-page__tag"
                  >
                    {{ formatPostTag(category.categoryName) }}
                  </span>
                </div>
              </div>

              <div class="post-page__summary-side">
                <div class="post-page__summary-stats">
                  <button
                      type="button"
                      class="post-page__stat-btn stat-button"
                      :class="{ 'post-page__stat-btn--active stat-button--active': activePost.isLiked }"
                      :disabled="isPostLikePending"
                      @click="() => togglePostLike()"
                  >
                    <img
                        :src="activePost.isLiked ? heartActiveIconUrl : heartIconUrl"
                        alt=""
                        class="post-page__summary-stat-icon post-page__summary-stat-icon--heart"
                    />
                    <span>{{ formatCompactNumber(activePost.likesCount) }}</span>
                  </button>
                  <span class="post-page__stat-dot" aria-hidden="true">•</span>
                  <span class="post-page__summary-stat">
                    <img
                        :src="playsIconUrl"
                        :alt="uk.home.popularFeed.listens"
                        class="post-page__summary-stat-icon post-page__summary-stat-icon--eye"
                    />
                    <span>{{ formatCompactNumber(activePost.listens) }}</span>
                  </span>
                </div>

                <button
                    type="button"
                    class="post-page__play-btn audio-play-button"
                    :class="{ 'audio-play-button--active': player.activePostId.value === activePost.postId }"
                    :aria-label="player.isPlaying.value && player.activePostId.value === activePost.postId ? uk.posts.audio.pause : uk.posts.audio.play"
                    @click="togglePlayback"
                >
                  <img
                      v-if="player.isPlaying.value && player.activePostId.value === activePost.postId"
                      :src="pauseLightIconUrl"
                      alt=""
                      class="audio-play-button__pause-icon"
                  />
                  <img
                      v-else
                      :src="playIconUrl"
                      :alt="uk.posts.audio.play"
                      class="audio-play-button__play-icon"
                  />
                </button>
              </div>
            </div>

            <p v-if="activePost.description" class="post-page__description">
              {{ activePost.description }}
            </p>

            <button
                v-if="isCommentsAvailable && isMobileViewport"
                type="button"
                class="post-page__mobile-comments-trigger"
                @click="openCommentsSheet"
            >
              <span class="post-page__mobile-comments-trigger-copy">
                <img
                    :src="commentIconUrl"
                    :alt="uk.home.popularFeed.comments"
                    class="post-page__mobile-comments-trigger-icon"
                />
                <span>{{ uk.posts.details.commentsTitle }}</span>
              </span>
              <span class="post-page__mobile-comments-trigger-count">{{ formatCompactNumber(displayedCommentsCount) }}</span>
            </button>
          </article>

          <BaseBottomSheet
              :enabled="isMobileViewport"
              :is-open="isMobileCommentsSheetOpen"
              :close-aria-label="uk.common.labels.cancel"
              @close="closeCommentsSheet"
          >
            <section
                id="comments"
                ref="commentsSectionElement"
                class="post-page__card post-page__comments"
                :class="{ 'post-page__comments--in-sheet': isMobileViewport }"
            >
            <div class="post-page__comments-head">
              <h2 class="post-page__section-title">{{ uk.posts.details.commentsTitle }}</h2>
              <div class="post-page__comments-head-side">
                <span class="post-page__comments-total">
                  <img
                      :src="commentIconUrl"
                      :alt="uk.home.popularFeed.comments"
                      class="post-page__comments-total-icon"
                  />
                  <span>{{ formatCompactNumber(displayedCommentsCount) }}</span>
                </span>

                <button
                    type="button"
                class="post-page__comments-close"
                :aria-label="uk.common.labels.cancel"
                @click="closeCommentsSheet"
                >
                  <img :src="closeIconUrl" alt="" class="post-page__comments-close-icon" />
                </button>
              </div>
            </div>

            <div class="post-page__comments-body">
            <div v-if="isCommentsAvailable" class="post-page__comments-sort">
              <button
                  v-for="option in ([CommentSortOrder.NEWEST, CommentSortOrder.POPULAR] as const)"
                  :key="option"
                  type="button"
                  class="post-page__sort-btn"
                  :class="{ 'post-page__sort-btn--active': commentsSort === option }"
                  @click="changeCommentsSort(option)"
              >
                {{ option === CommentSortOrder.NEWEST ? uk.posts.details.commentsSortNewest : uk.posts.details.commentsSortPopular }}
              </button>
            </div>

            <p v-if="!isCommentsAvailable" class="post-page__comments-note">
              {{ uk.posts.details.commentsClosed }}
            </p>

            <ErrorAlert v-if="commentsErrorMessage" :message="commentsErrorMessage" />

            <div v-if="isLoadingComments" class="post-page__state">
              {{ uk.common.labels.loading }}
            </div>

            <div v-else-if="!comments.length" class="post-page__empty">
              {{ uk.posts.details.commentsEmpty }}
            </div>

            <div v-else class="post-page__comment-list">
              <article
                  v-for="comment in comments"
                  :key="comment.commentId"
                  class="post-page__comment-thread"
              >
                <div class="post-page__comment">
                  <div class="post-page__comment-avatar-wrap">
                    <img
                        v-if="comment.author.photo"
                        :src="comment.author.photo"
                        :alt="comment.author.name"
                        class="post-page__comment-avatar"
                    />
                    <span v-else class="post-page__comment-avatar post-page__comment-avatar--fallback">
                      {{ getAuthorInitial(comment.author.name) }}
                    </span>
                  </div>

                  <div class="post-page__comment-body">
                    <div class="post-page__comment-head">
                      <strong class="post-page__comment-author">{{ comment.author.name }}</strong>
                      <span v-if="isLikedByPostAuthor(comment)" class="post-page__comment-author-like">
                        <img
                            :src="heartActiveIconUrl"
                            alt=""
                            class="post-page__comment-author-like-icon"
                        />
                        <img
                            v-if="activePost?.author.photo"
                            :src="activePost.author.photo"
                            :alt="activePost.author.name"
                            class="post-page__comment-author-like-avatar"
                        />
                        <span v-else class="post-page__comment-author-like-avatar post-page__comment-author-like-avatar--fallback">
                          {{ getAuthorInitial(activePost?.author.name ?? '') }}
                        </span>
                      </span>
                      <span v-if="formatCommentTime(comment.createdAt)" class="post-page__comment-time">
                        • {{ formatCommentTime(comment.createdAt) }}
                      </span>
                    </div>

                    <p class="post-page__comment-text">{{ comment.commentText }}</p>

                    <div class="post-page__comment-actions">
                      <button
                          type="button"
                          class="post-page__comment-action post-page__comment-action--like"
                          :class="{ 'post-page__comment-action--like-active': comment.isLiked }"
                          :disabled="isCommentLikePending(comment.commentId)"
                          @click="toggleCommentLike(comment)"
                      >
                        <img
                            :src="comment.isLiked ? heartActiveIconUrl : heartIconUrl"
                            alt=""
                            class="post-page__comment-action-icon"
                        />
                        <span class="post-page__comment-action-count">{{ formatCompactNumber(comment.likesCount) }}</span>
                      </button>

                      <button
                          type="button"
                          class="post-page__comment-action"
                          @click="toggleReplyForm(comment.commentId)"
                      >
                        {{ uk.posts.details.reply }}
                      </button>

                      <button
                          v-if="canDeleteComment(comment)"
                          type="button"
                          class="post-page__comment-action"
                          :disabled="isCommentDeleting(comment.commentId)"
                          @click="requestDeleteComment(comment)"
                      >
                        {{ uk.posts.details.deleteComment }}
                      </button>
                    </div>

                    <div v-if="isReplyFormOpen(comment.commentId)" class="post-page__reply-box">
                      <BaseField
                          v-model="replyDrafts[comment.commentId]"
                          :id="`post-comment-reply-${comment.commentId}`"
                          class="post-page__comment-field post-page__comment-field--reply"
                          label=""
                          :placeholder="uk.posts.details.replyPlaceholder"
                          :maxlength="5000"
                          :disabled="isSubmittingComment"
                          multiline
                          auto-resize
                          :auto-resize-max-height="132"
                          :rows="2"
                      />

                      <button
                          type="button"
                          class="post-page__send-btn post-page__send-btn--reply"
                          :disabled="isSubmittingComment || !(replyDrafts[comment.commentId] ?? '').trim()"
                          :aria-label="uk.posts.details.send"
                          @click="submitComment(comment.commentId)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M21 3 10 14" />
                          <path d="m21 3-7 18-4-7-7-4Z" />
                        </svg>
                      </button>
                    </div>

                    <button
                        v-if="comment.repliesCount && !isRepliesExpanded(comment.commentId)"
                        type="button"
                        class="post-page__toggle-replies"
                        @click="toggleReplies(comment)"
                    >
                      <span>{{ uk.posts.details.showReplies(comment.repliesCount) }}</span>
                      <span
                          class="post-page__toggle-replies-arrow"
                          aria-hidden="true"
                      />
                    </button>

                    <div v-if="isRepliesExpanded(comment.commentId)" class="post-page__replies">
                      <div v-if="isRepliesLoading(comment.commentId) && !getCommentReplies(comment.commentId).length" class="post-page__reply-loading">
                        {{ uk.common.labels.loading }}
                      </div>

                      <article
                          v-for="reply in getCommentReplies(comment.commentId)"
                          :key="reply.commentId"
                          class="post-page__comment post-page__comment--reply"
                      >
                        <div class="post-page__comment-avatar-wrap">
                          <img
                              v-if="reply.author.photo"
                              :src="reply.author.photo"
                              :alt="reply.author.name"
                              class="post-page__comment-avatar"
                          />
                          <span v-else class="post-page__comment-avatar post-page__comment-avatar--fallback">
                            {{ getAuthorInitial(reply.author.name) }}
                          </span>
                        </div>

                        <div class="post-page__comment-body">
                          <div class="post-page__comment-head">
                            <strong class="post-page__comment-author">{{ reply.author.name }}</strong>
                            <span v-if="isLikedByPostAuthor(reply)" class="post-page__comment-author-like">
                              <img
                                  :src="heartActiveIconUrl"
                                  alt=""
                                  class="post-page__comment-author-like-icon"
                              />
                              <img
                                  v-if="activePost?.author.photo"
                                  :src="activePost.author.photo"
                                  :alt="activePost.author.name"
                                  class="post-page__comment-author-like-avatar"
                              />
                              <span v-else class="post-page__comment-author-like-avatar post-page__comment-author-like-avatar--fallback">
                                {{ getAuthorInitial(activePost?.author.name ?? '') }}
                              </span>
                            </span>
                            <span v-if="formatCommentTime(reply.createdAt)" class="post-page__comment-time">
                              • {{ formatCommentTime(reply.createdAt) }}
                            </span>
                          </div>

                          <p class="post-page__comment-text">{{ reply.commentText }}</p>

                          <div class="post-page__comment-actions">
                            <button
                                type="button"
                                class="post-page__comment-action post-page__comment-action--like"
                                :class="{ 'post-page__comment-action--like-active': reply.isLiked }"
                                :disabled="isCommentLikePending(reply.commentId)"
                                @click="toggleCommentLike(reply)"
                            >
                              <img
                                  :src="reply.isLiked ? heartActiveIconUrl : heartIconUrl"
                                  alt=""
                                  class="post-page__comment-action-icon"
                              />
                              <span class="post-page__comment-action-count">{{ formatCompactNumber(reply.likesCount) }}</span>
                            </button>

                            <button
                                v-if="canDeleteComment(reply)"
                                type="button"
                                class="post-page__comment-action"
                                :disabled="isCommentDeleting(reply.commentId)"
                                @click="requestDeleteComment(reply)"
                            >
                              {{ uk.posts.details.deleteComment }}
                            </button>
                          </div>
                        </div>
                      </article>

                      <button
                          v-if="postsStore.commentRepliesHasMore[comment.commentId]"
                          type="button"
                          class="post-page__load-more"
                          :disabled="isRepliesLoading(comment.commentId)"
                          @click="loadMoreReplies(comment.commentId)"
                      >
                        {{ uk.posts.details.loadMoreReplies }}
                      </button>
                    </div>

                    <button
                        v-if="comment.repliesCount && isRepliesExpanded(comment.commentId)"
                        type="button"
                        class="post-page__toggle-replies"
                        @click="toggleReplies(comment)"
                    >
                      <span>{{ uk.posts.details.hideReplies }}</span>
                      <span
                          class="post-page__toggle-replies-arrow post-page__toggle-replies-arrow--expanded"
                          aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <button
                v-if="postsStore.commentsHasMore"
                type="button"
                class="post-page__load-more"
                @click="loadComments(false)"
            >
              {{ uk.home.popularFeed.loadingMore }}
            </button>
            </div>

            <div v-if="isCommentsAvailable" class="post-page__comment-composer">
              <BaseField
                  ref="rootCommentInputElement"
                  v-model="rootCommentDraft"
                  id="post-comment-root"
                  class="post-page__comment-field"
                  label=""
                  :placeholder="uk.posts.details.commentPlaceholder"
                  :maxlength="5000"
                  :disabled="isSubmittingComment"
                  multiline
                  auto-resize
                  :auto-resize-max-height="132"
                  :rows="2"
              />

              <button
                  type="button"
                  class="post-page__send-btn"
                  :disabled="isSubmittingComment || !rootCommentDraft.trim()"
                  :aria-label="uk.posts.details.send"
                  @click="submitComment()"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 3 10 14" />
                  <path d="m21 3-7 18-4-7-7-4Z" />
                </svg>
              </button>
            </div>
            </section>
          </BaseBottomSheet>
        </section>

        <aside class="post-page__column post-page__column--text">
          <section class="post-page__card post-page__text-card">
            <div class="post-page__text-head">
              <h2 class="post-page__section-title">{{ uk.posts.details.textTitle }}</h2>

              <button
                  v-if="activePost.text && isOwnPost"
                  type="button"
                  class="post-page__sync-btn"
                  :disabled="!canManageSynchronization"
                  @click="openSynchronizationManager"
              >
                {{ uk.posts.details.manageSynchronization }}
              </button>
            </div>

            <div v-if="activePost.text" class="post-page__text-content">
              <template v-for="(line, index) in textLines" :key="`${index}-${line}`">
                <button
                    v-if="synchronizationMap.has(index)"
                    :ref="(element) => setLineElement(index, element)"
                    type="button"
                    class="post-page__text-line post-page__text-line--interactive"
                    :class="{ 'post-page__text-line--active': activeLineIndex === index }"
                    :aria-label="uk.posts.details.playFromLine"
                    @click="jumpToLine(index)"
                >
                  {{ line || ' ' }}
                </button>

                <p
                    v-else
                    :ref="(element) => setLineElement(index, element)"
                    class="post-page__text-line"
                >
                  {{ line || ' ' }}
                </p>
              </template>
            </div>

            <p v-else class="post-page__empty">
              {{ uk.posts.details.noText }}
            </p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
          v-if="isDeletePostDialogOpen"
          :title="uk.posts.details.deletePostTitle"
          :message="uk.posts.details.deletePostMessage"
          :confirm-label="uk.posts.details.delete"
          :cancel-label="uk.common.labels.cancel"
          @close="isDeletePostDialogOpen = false"
          @confirm="deletePost"
      />

      <ConfirmDialog
          v-if="pendingDeleteComment"
          :title="uk.posts.details.deleteCommentTitle"
          :message="uk.posts.details.deleteCommentMessage"
          :confirm-label="uk.posts.details.deleteComment"
          :cancel-label="uk.common.labels.cancel"
          @close="closeDeleteCommentDialog"
          @confirm="confirmDeleteComment"
      />
    </div>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />
</template>
